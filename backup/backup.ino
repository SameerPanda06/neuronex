/*
 * backup.ino — Neuronex ESP32 Ground Station Bridge (SELF-CONTAINED BACKUP)
 * =======================================================
 * Receives LoRa packets from Pi TX (Neuranex satellites), reassembles images,
 * drives the ARQ handshake (STATUS / NACK / ACK), and forwards EVERYTHING to the
 * laptop over USB serial with 0xAA framing. Detailed Serial Monitor output for
 * the 60s downlink window, segments received, and missing segments being asked for.
 *
 * Protocol (MUST match backup.py):
 *   Header (36B): [VER:u8][TYPE:u8][MISSION:6B][IMAGE:6B][CHUNK:u16][TOTAL:u16][LEN:u16][CRC:16B]
 *   CRC32 (poly 0xEDB88320, init 0xFFFFFFFF) over header(CRC zeroed) + payload
 *   Packet types: DATA=0 ACK=1 NACK=2 META=3 STATUS=4 DONE=5
 *   STATUS payload: [total:u16][recvd:u16][count:u8][missing...]
 *
 * LoRa: 433 MHz, SF7, BW125, CR4/5, Sync 0x12, Explicit header, CRC on, 17 dBm
 *
 * Build: PlatformIO (env: esp32dev) or Arduino IDE with RadioLib installed.
 */

#include <Arduino.h>
#include <SPI.h>
#include <RadioLib.h>
#include <set>

// ============================================================
// HARDWARE PINS (adjust for your ESP32 board)
// ============================================================
#define LORA_NSS   5
#define LORA_RST   14
#define LORA_DIO0  26
#define LORA_MOSI  23
#define LORA_MISO  19
#define LORA_SCK   18

#define LED_STATUS 2    // onboard LED
#define LED_RX     4    // external RX LED

// ============================================================
// LORA CONFIG (match backup.py)
// ============================================================
const float LORA_FREQ     = 433.0;
const int   LORA_SF       = 7;
const float LORA_BW       = 125.0;   // kHz
const int   LORA_CR       = 5;       // 4/5
const int   LORA_SYNC     = 0x12;
const int   LORA_PREAMBLE = 8;
const int   LORA_TX_POWER = 17;      // dBm

// ============================================================
// PROTOCOL CONSTANTS (match backup.py)
// ============================================================
#define PROTOCOL_VERSION 1
#define HEADER_SIZE 36
#define PKT_DATA   0
#define PKT_ACK    1
#define PKT_NACK   2
#define PKT_META   3
#define PKT_STATUS 4
#define PKT_DONE   5
#define PKT_CMD    7

#define BATCH_ACK_THRESHOLD 4        // send STATUS every 4 DATA packets

// PKT_CMD sub-commands (ground -> satellite)
#define CMD_PRIORITY     0x01   // value: 1=CLEAR, 2=CLOUDY
#define CMD_RESET        0x02   // clear ESP32 persisted state
#define CMD_STATUS_REQ   0x03   // request status echo

// Serial framing (ESP32 -> laptop)
#define SERIAL_START_BYTE 0xAA
#define SERIAL_MAX_PAYLOAD 255
#define CRC16_POLY 0x1021
#define CRC16_INIT 0xFFFF

// ============================================================
// GLOBALS
// ============================================================
SX1278 radio = new Module(LORA_NSS, LORA_DIO0, LORA_RST);

uint8_t rx_buffer[256];
volatile bool rx_done = false;
volatile bool rx_error = false;

// Per-image reception state
char current_mission[7] = "";
char current_image[7]  = "";
uint16_t current_total_segments = 0;
std::set<uint16_t> received_segments;
uint16_t packets_since_status = 0;
uint32_t image_start_time = 0;
const uint32_t DOWNLINK_WINDOW_SEC = 180;   // 3 minutes
bool receiving_image = false;

// Latency / throughput tracking
uint32_t ml_latency_ms = 0;
uint32_t compression_ms = 0;
uint32_t total_bytes_received = 0;
uint32_t total_airtime_ms = 0;
uint32_t last_data_time = 0;
uint32_t batch_start_time = 0;
uint16_t batch_bytes = 0;

// Serial TX buffer
uint8_t serial_tx_buf[600];

// Stats
uint32_t stats_lora_rx = 0;
uint32_t stats_lora_crc_err = 0;
uint32_t stats_serial_tx = 0;

// ============================================================
// LED STATE MACHINE
// ============================================================
enum LedState {
  LED_IDLE,           // Red off, Blue off - no link
  LED_LINK,           // Red ON, Blue off - bridge active
  LED_HANDSHAKE,      // Red ON, Blue BLINK - first ~10s handshake
  LED_TRANSFERRING,   // Red ON, Blue ON - active DATA transfer
  LED_COMPLETE        // Red ON, Blue OFF - window ended cleanly
};

LedState led_state = LED_IDLE;
uint32_t led_transition_time = 0;
bool led_blue_on = false;

// NVS persistence
#include <Preferences.h>
Preferences nvs;
const char* NVS_NAMESPACE = "neuranex";
bool nvs_initialized = false;
bool nvs_dirty = false;

// Command state
uint8_t target_priority = 1;  // 1=CLEAR only, 2=CLEAR+CLOUDY
bool cmd_received_this_window = false;

// ============================================================
// CRC32 (match backup.py)
// ============================================================
uint32_t crc32_update(uint32_t crc, const uint8_t* data, size_t len) {
  for (size_t i = 0; i < len; i++) {
    crc ^= data[i];
    for (int j = 0; j < 8; j++) {
      crc = (crc >> 1) ^ (0xEDB88320 & (-(int32_t)(crc & 1)));
    }
  }
  return crc;
}

uint32_t calculate_crc(const uint8_t* data, size_t len) {
  return (~crc32_update(0xFFFFFFFF, data, len)) & 0xFFFFFFFF;
}

// ============================================================
// CRC16-CCITT (serial framing)
// ============================================================
uint16_t crc16_ccitt(const uint8_t* data, size_t len, uint16_t init = CRC16_INIT) {
  uint16_t crc = init;
  for (size_t i = 0; i < len; i++) {
    crc ^= (uint16_t)data[i] << 8;
    for (int j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ CRC16_POLY;
      else crc <<= 1;
    }
  }
  return crc;
}

// ============================================================
// RADIO CALLBACKS
// ============================================================
void setFlag(void) {
  // ISR: just record that a packet arrived; detailed IRQ checks happen in loop()
  rx_done = true;
}

// ============================================================
// SERIAL FRAMING (ESP32 -> laptop)
// ============================================================
void serial_send_packet(const uint8_t* payload, size_t len) {
  if (len > SERIAL_MAX_PAYLOAD) len = SERIAL_MAX_PAYLOAD;
  uint8_t frame[4 + SERIAL_MAX_PAYLOAD + 2];
  frame[0] = SERIAL_START_BYTE;
  frame[1] = (len >> 8) & 0xFF;
  frame[2] = len & 0xFF;
  memcpy(&frame[3], payload, len);
  uint16_t crc = crc16_ccitt(&frame[1], 2 + len);
  frame[3 + len] = (crc >> 8) & 0xFF;
  frame[3 + len + 1] = crc & 0xFF;
  Serial.write(frame, 5 + len);
  stats_serial_tx++;
}

// ============================================================
// LORA RECEIVE
// ============================================================
int16_t receive_packet(uint8_t* buf, size_t maxlen, int16_t* rssi, float* snr) {
  rx_done = false;
  rx_error = false;
  radio.startReceive();
  uint32_t t0 = millis();
  while (!rx_done && (millis() - t0) < 2000) {
    yield();
  }
  if (!rx_done) return -1;
  if (rx_error) { stats_lora_crc_err++; return -2; }

  int16_t len = radio.getPacketLength();
  if (len <= 0 || len > (int16_t)maxlen) return -1;
  int16_t state = radio.readData(buf, len);
  if (state != RADIOLIB_ERR_NONE) return -1;
  *rssi = radio.getRSSI();
  *snr = radio.getSNR();
  stats_lora_rx++;
  return len;
}

// ============================================================
// STATUS / NACK / ACK builders (match backup.py byte layout)
// ============================================================
void send_status(int16_t rssi, float snr) {
  uint16_t total = current_total_segments;
  uint16_t recvd = received_segments.size();
  uint8_t count = 0;
  uint8_t missing[255];
  for (uint16_t s = 0; s < total && count < 255; s++) {
    if (received_segments.find(s) == received_segments.end()) {
      missing[count++] = (uint8_t)s;
    }
  }
  uint8_t payload[5 + 255];
  payload[0] = (total >> 8) & 0xFF; payload[1] = total & 0xFF;
  payload[2] = (recvd >> 8) & 0xFF; payload[3] = recvd & 0xFF;
  payload[4] = count;
  memcpy(&payload[5], missing, count);
  uint16_t body_len = 5 + count;

  uint8_t header[HEADER_SIZE];
  header[0] = PROTOCOL_VERSION; header[1] = PKT_STATUS;
  memcpy(&header[2], current_mission, 6);
  memcpy(&header[8], current_image, 6);
  header[14] = 0xFF; header[15] = 0xFF;
  header[16] = (total >> 8) & 0xFF; header[17] = total & 0xFF;
  header[18] = (body_len >> 8) & 0xFF; header[19] = body_len & 0xFF;
  memset(&header[20], 0, 16);
  uint32_t crc = calculate_crc(header, HEADER_SIZE - 16); // header w/o CRC field
  crc = calculate_crc(payload, 5 + count);                // then payload
  // (CRC computed over header[0..19] + payload per Pi convention)
  uint32_t crc_full = crc32_update(0xFFFFFFFF, header, HEADER_SIZE);
  crc_full = crc32_update(crc_full, payload, 5 + count);
  crc_full = (~crc_full) & 0xFFFFFFFF;

  uint8_t pkt[HEADER_SIZE + 5 + 255];
  memcpy(pkt, header, HEADER_SIZE);
  memcpy(&pkt[20], (uint8_t*)&crc_full, 4);
  memcpy(&pkt[HEADER_SIZE], payload, 5 + count);
  radio.transmit(pkt, HEADER_SIZE + 5 + count);
  Serial.printf("  [STATUS] -> Pi: %u/%u confirmed, %u missing -> asking\n", recvd, total, count);
  if (count > 0) {
    Serial.print("           missing: ");
    for (uint8_t i = 0; i < count; i++) { Serial.printf("%d ", missing[i]); }
    Serial.println();
  }
}

void send_ack(int16_t rssi, float snr) {
  uint8_t header[HEADER_SIZE];
  header[0] = PROTOCOL_VERSION; header[1] = PKT_ACK;
  memcpy(&header[2], current_mission, 6);
  memcpy(&header[8], current_image, 6);
  header[14] = 0xFF; header[15] = 0xFF; header[16] = 0xFF; header[17] = 0xFF;
  header[18] = 0x00; header[19] = 0x00;   // payload_len = 0
  memset(&header[20], 0, 16);
  uint32_t crc_full = crc32_update(0xFFFFFFFF, header, HEADER_SIZE);
  crc_full = (~crc_full) & 0xFFFFFFFF;
  uint8_t pkt[HEADER_SIZE];
  memcpy(pkt, header, HEADER_SIZE);
  memcpy(&pkt[20], (uint8_t*)&crc_full, 4);
  radio.transmit(pkt, HEADER_SIZE);
  Serial.printf("  [ACK] -> Pi: image COMPLETE (%u/%u)\n", current_total_segments, current_total_segments);
}

void send_nack(int16_t rssi, float snr) {
  uint16_t total = current_total_segments;
  uint8_t count = 0;
  uint8_t missing[255];
  for (uint16_t s = 0; s < total && count < 255; s++) {
    if (received_segments.find(s) == received_segments.end()) {
      missing[count++] = (uint8_t)s;
    }
  }
  uint8_t payload[14 + 255];
  memcpy(&payload[0], current_mission, 6);
  memcpy(&payload[6], current_image, 6);
  payload[12] = (count >> 8) & 0xFF; payload[13] = count & 0xFF;
  memcpy(&payload[14], missing, count);
  uint16_t body_len = 14 + count;

  uint8_t header[HEADER_SIZE];
  header[0] = PROTOCOL_VERSION; header[1] = PKT_NACK;
  memcpy(&header[2], current_mission, 6);
  memcpy(&header[8], current_image, 6);
  header[14] = 0xFF; header[15] = 0xFF; header[16] = 0xFF; header[17] = 0xFF;
  header[18] = (body_len >> 8) & 0xFF; header[19] = body_len & 0xFF;
  memset(&header[20], 0, 16);
  uint32_t crc_full = crc32_update(0xFFFFFFFF, header, HEADER_SIZE);
  crc_full = crc32_update(crc_full, payload, body_len);
  crc_full = (~crc_full) & 0xFFFFFFFF;
  uint8_t pkt[HEADER_SIZE + 14 + 255];
  memcpy(pkt, header, HEADER_SIZE);
  memcpy(&pkt[20], (uint8_t*)&crc_full, 4);
  memcpy(&pkt[HEADER_SIZE], payload, body_len);
  radio.transmit(pkt, HEADER_SIZE + body_len);
  Serial.printf("  [NACK] -> Pi: %u missing segments requested\n", count);
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);
  delay(500);

  pinMode(LED_STATUS, OUTPUT);
  pinMode(LED_RX, OUTPUT);
  digitalWrite(LED_STATUS, LOW);
  digitalWrite(LED_RX, LOW);

  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_NSS);

  // Initialize NVS
  nvs.begin(NVS_NAMESPACE, false);
  nvs_initialized = true;
  load_nvs_state();

  Serial.println("\n============================================================");
  Serial.println(" Neuronex ESP32 Ground Station Bridge (backup.ino)");
  Serial.println("============================================================");

  int16_t state = radio.begin();
  if (state != RADIOLIB_ERR_NONE) {
    Serial.printf("[FAIL] Radio init error: %d\n", state);
    while (true) { delay(1000); }
  }
  radio.setFrequency(LORA_FREQ);
  radio.setSpreadingFactor(LORA_SF);
  radio.setBandwidth(LORA_BW);
  radio.setCodingRate(LORA_CR);
  radio.setSyncWord(LORA_SYNC);
  radio.setPreambleLength(LORA_PREAMBLE);
  radio.setCRC(true);
  radio.setOutputPower(LORA_TX_POWER);
  radio.setDio0Action(setFlag, RISING);

  Serial.println("[RADIO] Ready: 433MHz SF7 BW125 CR4/5 Sync=0x12");
  Serial.println("[PROTO] DATA=0 ACK=1 NACK=2 META=3 STATUS=4 DONE=5 CMD=7");
  Serial.println("[BRIDGE] Forwarding all frames to laptop (0xAA framing @ 115200)");
  Serial.println("============================================================\n");

  radio.startReceive();
  update_led(LED_LINK);  // Bridge active after radio init
}

// ============================================================
// NVS PERSISTENCE
// ============================================================
void save_nvs_state() {
  if (!nvs_initialized) return;
  // Save received segments as bit-packed blob (max 256 segments = 32 bytes)
  uint8_t blob[32] = {0};
  for (uint16_t seg : received_segments) {
    if (seg < 256) blob[seg / 8] |= (1 << (seg % 8));
  }
  nvs.putBytes("segments", blob, sizeof(blob));
  nvs.putUInt("total_segs", current_total_segments);
  nvs.putString("mission", current_mission);
  nvs.putString("image", current_image);
  nvs.putUInt("target_prio", target_priority);
  nvs.putBool("in_window", receiving_image);
  nvs_dirty = false;
}

void load_nvs_state() {
  if (!nvs_initialized) return;
  uint8_t blob[32];
  size_t len = nvs.getBytes("segments", blob, sizeof(blob));
  if (len > 0) {
    received_segments.clear();
    for (uint16_t seg = 0; seg < 256; seg++) {
      if (blob[seg / 8] & (1 << (seg % 8))) received_segments.insert(seg);
    }
  }
  current_total_segments = nvs.getUInt("total_segs", 0);
  String m = nvs.getString("mission", "");
  String i = nvs.getString("image", "");
  m.toCharArray(current_mission, 7);
  i.toCharArray(current_image, 7);
  target_priority = nvs.getUInt("target_prio", 1);
  receiving_image = nvs.getBool("in_window", false);
  if (received_segments.size() > 0) {
    Serial.printf("[NVS] Restored: %s/%s, %u segments, prio=%d\n",
                  current_mission, current_image, received_segments.size(), target_priority);
  }
}

void clear_nvs_state() {
  if (!nvs_initialized) return;
  nvs.clear();
  received_segments.clear();
  current_total_segments = 0;
  current_mission[0] = 0;
  current_image[0] = 0;
  receiving_image = false;
  nvs_dirty = false;
  Serial.println("[NVS] State cleared");
}

// ============================================================
// LED STATE MACHINE
// ============================================================
void update_led(LedState new_state) {
  led_state = new_state;
  led_transition_time = millis();
  led_blue_on = false;

  switch (led_state) {
    case LED_IDLE:
      digitalWrite(LED_STATUS, LOW);   // Red OFF
      digitalWrite(LED_RX, LOW);       // Blue OFF
      break;
    case LED_LINK:
      digitalWrite(LED_STATUS, HIGH);  // Red ON (bridge active)
      digitalWrite(LED_RX, LOW);       // Blue OFF
      break;
    case LED_HANDSHAKE:
      digitalWrite(LED_STATUS, HIGH);  // Red ON
      digitalWrite(LED_RX, HIGH);      // Blue ON (will blink)
      led_blue_on = true;
      break;
    case LED_TRANSFERRING:
      digitalWrite(LED_STATUS, HIGH);  // Red ON
      digitalWrite(LED_RX, HIGH);      // Blue ON solid
      led_blue_on = true;
      break;
    case LED_COMPLETE:
      digitalWrite(LED_STATUS, HIGH);  // Red ON
      digitalWrite(LED_RX, LOW);       // Blue OFF
      break;
  }
}

void tick_led() {
  uint32_t now = millis();
  switch (led_state) {
    case LED_HANDSHAKE:
      // Blink blue every 500ms
      if (now - led_transition_time > 500) {
        led_blue_on = !led_blue_on;
        digitalWrite(LED_RX, led_blue_on ? HIGH : LOW);
        led_transition_time = now;
      }
      break;
    case LED_TRANSFERRING:
      // Solid blue - keep ON
      if (!led_blue_on) {
        digitalWrite(LED_RX, HIGH);
        led_blue_on = true;
      }
      break;
    case LED_COMPLETE:
      // Blue off, red on
      if (led_blue_on) {
        digitalWrite(LED_RX, LOW);
        led_blue_on = false;
      }
      break;
    default:
      break;
  }
}

// ============================================================
// CMD HANDLING
// ============================================================
void handle_cmd_packet(const uint8_t* payload, size_t payload_len) {
  if (payload_len < 2) return;
  uint8_t cmd = payload[0];
  uint8_t value = payload[1];

  switch (cmd) {
    case CMD_PRIORITY:
      target_priority = value;
      Serial.printf("[CMD] Priority set to %d (%s)\n", value, value == 1 ? "CLEAR" : "CLEAR+CLOUDY");
      save_nvs_state();
      break;
    case CMD_RESET:
      clear_nvs_state();
      update_led(LED_LINK);
      break;
    case CMD_STATUS_REQ:
      send_status(radio.getRSSI(), radio.getSNR());
      break;
  }
}

// ============================================================
// LOOP
// ============================================================
void loop() {
  int16_t rssi; float snr;
  int16_t len = receive_packet(rx_buffer, sizeof(rx_buffer), &rssi, &snr);

  if (len < HEADER_SIZE) {
    if (len == -2) { Serial.println("[RX] CRC error — dropping"); }
    return;
  }

  // Parse header
  uint8_t ver = rx_buffer[0];
  uint8_t ptype = rx_buffer[1];
  char mission[7], image[7];
  memcpy(mission, &rx_buffer[2], 6); mission[6] = 0;
  memcpy(image, &rx_buffer[8], 6); image[6] = 0;
  uint16_t chunk_num = (rx_buffer[14] << 8) | rx_buffer[15];
  uint16_t total_segs = (rx_buffer[16] << 8) | rx_buffer[17];
  uint16_t payload_len = (rx_buffer[18] << 8) | rx_buffer[19];

  // Forward raw packet to laptop (serial bridge)
  serial_send_packet(rx_buffer, len);

  // New image detected?
  if (receiving_image == false ||
      strncmp(mission, current_mission, 6) != 0 ||
      strncmp(image, current_image, 6) != 0) {
    strcpy(current_mission, mission);
    strcpy(current_image, image);
    current_total_segments = total_segs;
    received_segments.clear();
    packets_since_status = 0;
    image_start_time = millis();
    receiving_image = true;
    Serial.printf("\n[NEW IMAGE] %s / %s | total_segs=%u\n", mission, image, total_segs);
  }

  digitalWrite(LED_RX, HIGH); delay(5); digitalWrite(LED_RX, LOW);

  // New image starts handshake phase
  if (ptype == PKT_META && led_state != LED_HANDSHAKE && led_state != LED_TRANSFERRING) {
    update_led(LED_HANDSHAKE);
  }

  if (ptype == PKT_META) {
    String meta = "";
    for (int i = HEADER_SIZE; i < len; i++) meta += (char)rx_buffer[i];
    Serial.printf("[META] %s/%s | %s\n", mission, image, meta.c_str());
    Serial.printf("       RSSI=%ddBm SNR=%.1fdB\n", rssi, snr);

    // Parse ML latency and compression time from META
    int ml_idx = meta.indexOf("\"ml_latency_ms\":");
    int comp_idx = meta.indexOf("\"compression_ms\":");
    if (ml_idx > 0) {
      ml_latency_ms = meta.substring(meta.indexOf(":", ml_idx) + 1).toInt();
    }
    if (comp_idx > 0) {
      compression_ms = meta.substring(meta.indexOf(":", comp_idx) + 1).toInt();
    }
    if (ml_latency_ms > 0 || compression_ms > 0) {
      Serial.printf("       [LATENCY] ML: %lums | Compression: %lums\n", ml_latency_ms, compression_ms);
    }

  } else if (ptype == PKT_DATA) {
    // First DATA packet -> transition to TRANSFERRING
    if (led_state == LED_HANDSHAKE) {
      update_led(LED_TRANSFERRING);
    }
    received_segments.insert(chunk_num);
    nvs_dirty = true;
    packets_since_status++;
    uint8_t pct = (uint8_t)(received_segments.size() * 100 / max(total_segs, (uint16_t)1));

    // Track throughput
    if (batch_start_time == 0) batch_start_time = millis();
    total_bytes_received += payload_len;
    batch_bytes += payload_len;
    uint32_t now = millis();
    uint32_t batch_elapsed = now - batch_start_time;
    uint32_t total_elapsed = now - image_start_time;
    total_airtime_ms += (now - last_data_time) > 0 ? (now - last_data_time) : 0;
    last_data_time = now;

    uint16_t inst_bps = (batch_elapsed > 0) ? (batch_bytes * 1000 / batch_elapsed) : 0;
    uint16_t avg_bps = (total_elapsed > 0) ? (total_bytes_received * 1000 / total_elapsed) : 0;

    Serial.printf("[DATA] seg %3u/%-3u | recv %3u/%u (%3u%%) | inst %u B/s | avg %u B/s | RSSI=%ddBm SNR=%.1fdB\n",
                  chunk_num, total_segs, received_segments.size(), total_segs, pct, inst_bps, avg_bps, rssi, snr);

    if (received_segments.size() >= total_segs) {
      send_ack(rssi, snr);
      uint32_t final_elapsed = millis() - image_start_time;
      float eff_kbps = (final_elapsed > 0) ? (total_bytes_received * 8.0 / final_elapsed) : 0.0;
      Serial.printf("[DONE] Image %s/%s fully received!\n", mission, image);
      Serial.printf("       [LATENCY] ML: %lums | Comp: %lums | RX: %lums airtime | %lu KB | eff %.1f kbps | %lus\n",
                    ml_latency_ms, compression_ms, total_airtime_ms, total_bytes_received / 1024, eff_kbps, final_elapsed / 1000);
      receiving_image = false;
      batch_start_time = 0;
      batch_bytes = 0;
      total_bytes_received = 0;
      total_airtime_ms = 0;
      ml_latency_ms = 0;
      compression_ms = 0;
    } else if (packets_since_status >= BATCH_ACK_THRESHOLD) {
      packets_since_status = 0;
      batch_start_time = 0;
      batch_bytes = 0;
      send_status(rssi, snr);
    }

  } else if (ptype == PKT_DONE) {
    Serial.printf("[DONE] Pi confirmed completion of %s/%s\n", mission, image);
    receiving_image = false;

  } else if (ptype == PKT_STATUS) {
    Serial.printf("[STATUS] (loopback) %s/%s\n", mission, image);

  } else if (ptype == PKT_ACK) {
    Serial.printf("[ACK] (loopback) %s/%s\n", mission, image);

  } else if (ptype == PKT_CMD) {
    // Extract payload (after 36-byte header)
    size_t payload_len = len - HEADER_SIZE;
    if (payload_len > 0) {
      handle_cmd_packet(&rx_buffer[HEADER_SIZE], payload_len);
    }

  } else {
    Serial.printf("[UNK] type=%u len=%d from %s/%s\n", ptype, len, mission, image);
  }

  // Window timeout -> request missing before next revolution
  uint32_t elapsed = (millis() - image_start_time) / 1000;
  if (receiving_image && elapsed >= DOWNLINK_WINDOW_SEC) {
    uint16_t missing = total_segs - received_segments.size();
    if (missing > 0) {
      float eff_kbps = (elapsed > 0) ? (total_bytes_received * 8.0 / (elapsed * 1000)) : 0.0;
      Serial.printf("\n[WINDOW END] %lus elapsed | %u/%u recv (%u missing) | %.1f kbps | ML %lums | Comp %lums\n",
                    elapsed, received_segments.size(), total_segs, missing, eff_kbps, ml_latency_ms, compression_ms);
      send_nack(rssi, snr);
    }
    receiving_image = false;
    batch_start_time = 0;
    batch_bytes = 0;
    total_bytes_received = 0;
    total_airtime_ms = 0;
    ml_latency_ms = 0;
    compression_ms = 0;
    update_led(LED_COMPLETE);
  }

  // Tick LED state machine
  tick_led();

  // Periodic NVS save during active reception
  if (nvs_dirty && receiving_image && (millis() % 5000 < 50)) {
    save_nvs_state();
  }

  // Handle serial commands from laptop (PKT_CMD forwarding)
  if (Serial.available() > 0) {
    // Read full serial frame (0xAA + len_hi + len_lo + payload + crc16)
    if (Serial.peek() == SERIAL_START_BYTE) {
      uint8_t frame_buf[SERIAL_MAX_PAYLOAD + 5];
      size_t frame_len = Serial.readBytes(frame_buf, Serial.available());
      if (frame_len >= 5) {
        // Validate CRC
        uint16_t frame_crc = (frame_buf[frame_len - 2] << 8) | frame_buf[frame_len - 1];
        uint16_t calc_crc = crc16_ccitt(&frame_buf[1], frame_len - 3);
        if (frame_crc == calc_crc) {
          // Extract payload (LoRa packet)
          size_t payload_len = (frame_buf[1] << 8) | frame_buf[2];
          uint8_t* lora_pkt = &frame_buf[3];
          if (payload_len >= HEADER_SIZE && lora_pkt[1] == PKT_CMD) {
            // Forward command via LoRa
            radio.transmit(lora_pkt, payload_len);
            Serial.printf("[SERIAL->LORA] Forwarded PKT_CMD (%u bytes)\n", payload_len);
          }
        }
      }
    }
  }
}
