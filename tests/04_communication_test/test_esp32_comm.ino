/*
 * test_esp32_comm.ino — ESP32 Full ARQ Protocol Test
 * Receives META → DATA, sends STATUS/NACK/ACK
 * Matches backup.py protocol exactly
 */
#include <Arduino.h>
#include <SPI.h>
#include <RadioLib.h>
#include <set>

#define LORA_NSS    5
#define LORA_RST    14
#define LORA_DIO0   26
#define LORA_MOSI   23
#define LORA_MISO   19
#define LORA_SCK    18
#define LED_STATUS  2
#define LED_BLUE    13

// Protocol types (match backup.py)
#define PKT_DATA   0
#define PKT_ACK    1
#define PKT_NACK   2
#define PKT_META   3
#define PKT_STATUS 4
#define PKT_DONE   5
#define PROTO_VER  1
#define HDR_SIZE   36

// SX1278 Registers
#define REG_OP_MODE         0x01
#define REG_FRF_MSB         0x06
#define REG_FRF_MID         0x07
#define REG_FRF_LSB         0x08
#define REG_PA_CONFIG       0x09
#define REG_LNA             0x0C
#define REG_FIFO_ADDR_PTR   0x0D
#define REG_FIFO_TX_BASE    0x0E
#define REG_FIFO_RX_BASE    0x0F
#define REG_IRQ_FLAGS       0x12
#define REG_RX_NB_BYTES     0x13
#define REG_PKT_SNR_VALUE   0x19
#define REG_PKT_RSSI_VALUE  0x1A
#define REG_MODEM_CONFIG_1  0x1D
#define REG_MODEM_CONFIG_2  0x1E
#define REG_MODEM_CONFIG_3  0x26
#define REG_PAYLOAD_LENGTH  0x22
#define REG_SYNC_WORD       0x39
#define REG_DIO_MAPPING_1   0x40
#define REG_VERSION         0x42

#define MODE_SLEEP  0x80
#define MODE_STDBY  0x81
#define MODE_TX     0x83
#define MODE_RX_CONT 0x85

SX1278 radio = new Module(LORA_NSS, LORA_DIO0, LORA_RST);

volatile bool rx_flag = false;
void IRAM_ATTR onRx() { rx_flag = true; }

// State per image
char cur_mission[7] = "";
char cur_image[7] = "";
uint16_t cur_total = 0;
std::set<uint16_t> recv_segs;
uint32_t last_pkt = 0;
bool have_img = false;

// CRC32 (match backup.py)
uint32_t crc32_update(uint32_t crc, const uint8_t* data, size_t len) {
  for (size_t i = 0; i < len; i++) {
    crc ^= data[i];
    for (int j = 0; j < 8; j++) crc = (crc >> 1) ^ (0xEDB88320 & (-(int32_t)(crc & 1)));
  }
  return crc;
}
uint32_t crc32(const uint8_t* data, size_t len) {
  return (~crc32_update(0xFFFFFFFF, data, len)) & 0xFFFFFFFF;
}

void apply_pi_config() {
  write_reg(REG_OP_MODE, 0x80); delay(10);
  write_reg(0x06, 0x6C); write_reg(0x07, 0x80); write_reg(0x08, 0x00);
  write_reg(0x09, 0x8F); write_reg(0x0C, 0x23);
  write_reg(0x0E, 0x00); write_reg(0x0F, 0x00);
  write_reg(0x1D, 0x72); write_reg(0x1E, 0x74); write_reg(0x26, 0x04);
  write_reg(0x39, 0x12); write_reg(0x40, 0x40);
  write_reg(0x02, 0x00); write_reg(0x03, 0x08);
  write_reg(REG_OP_MODE, MODE_STDBY); delay(10);
}

void write_reg(uint8_t addr, uint8_t val) { radio.writeReg(addr, val); }
uint8_t read_reg(uint8_t addr) { return radio.readReg(addr); }

void send_status(int16_t rssi, float snr) {
  uint8_t payload[260];
  payload[0] = (cur_total >> 8) & 0xFF;
  payload[1] = cur_total & 0xFF;
  uint16_t recvd = recv_segs.size();
  payload[2] = (recvd >> 8) & 0xFF;
  payload[3] = recvd & 0xFF;
  uint8_t missing_count = 0;
  for (uint16_t s = 0; s < cur_total && missing_count < 255; s++) {
    if (recv_segs.find(s) == recv_segs.end()) payload[5 + missing_count++] = (uint8_t)s;
  }
  payload[4] = missing_count;

  uint8_t header[HDR_SIZE];
  header[0] = PROTO_VER; header[1] = PKT_STATUS;
  memcpy(&header[2], cur_mission, 6);
  memcpy(&header[8], cur_image, 6);
  header[14] = 0xFF; header[15] = 0xFF;
  header[16] = (cur_total >> 8) & 0xFF; header[17] = cur_total & 0xFF;
  memset(&header[20], 0, 16);

  uint32_t crc = crc32_update(0xFFFFFFFF, header, 20);
  crc = crc32_update(crc, payload, 5 + missing_count); crc = (~crc) & 0xFFFFFFFF;

  uint8_t pkt[HDR_SIZE + 260];
  memcpy(pkt, header, 20); memcpy(&pkt[20], (uint8_t*)&crc, 4); memcpy(&pkt[24], payload, 5 + missing_count);
  radio.transmit(pkt, HDR_SIZE + 5 + missing_count);
  Serial.printf("[TX] STATUS: total=%u recvd=%u missing=%u\n", cur_total, recvd, missing_count);
}

void send_ack() {
  uint8_t header[HDR_SIZE];
  header[0] = PROTO_VER; header[1] = PKT_ACK;
  memcpy(&header[2], cur_mission, 6);
  memcpy(&header[8], cur_image, 6);
  header[14] = 0xFF; header[15] = 0xFF; header[16] = 0xFF; header[17] = 0xFF;
  memset(&header[20], 0, 16);
  uint32_t crc = crc32_update(0xFFFFFFFF, header, 20); crc = (~crc) & 0xFFFFFFFF;
  uint8_t pkt[HDR_SIZE];
  memcpy(pkt, header, 20); memcpy(&pkt[20], (uint8_t*)&crc, 4);
  radio.transmit(pkt, HDR_SIZE);
  Serial.printf("[TX] ACK: COMPLETE (%u/%u)\n", cur_total, cur_total);
}

void send_nack() {
  uint8_t payload[270];
  memcpy(&payload[0], cur_mission, 6);
  memcpy(&payload[6], cur_image, 6);
  uint8_t missing_count = 0;
  for (uint16_t s = 0; s < cur_total && missing_count < 255; s++) {
    if (recv_segs.find(s) == recv_segs.end()) payload[14 + missing_count++] = (uint8_t)s;
  }
  payload[12] = (missing_count >> 8) & 0xFF; payload[13] = missing_count & 0xFF;

  uint8_t header[HDR_SIZE];
  header[0] = PROTO_VER; header[1] = PKT_NACK;
  memcpy(&header[2], cur_mission, 6);
  memcpy(&header[8], cur_image, 6);
  header[14] = 0xFF; header[15] = 0xFF; header[16] = 0xFF; header[17] = 0xFF;
  memset(&header[20], 0, 16);
  uint32_t crc = crc32_update(0xFFFFFFFF, header, 20);
  crc = crc32_update(crc, payload, 14 + missing_count); crc = (~crc) & 0xFFFFFFFF;
  uint8_t pkt[HDR_SIZE + 270];
  memcpy(pkt, header, 20); memcpy(&pkt[20], (uint8_t*)&crc, 4); memcpy(&pkt[24], payload, 14 + missing_count);
  radio.transmit(pkt, HDR_SIZE + 14 + missing_count);
  Serial.printf("[TX] NACK: %u missing\n", missing_count);
}

void setup() {
  Serial.begin(115200); delay(1000);
  pinMode(LED_STATUS, OUTPUT); pinMode(LED_BLUE, OUTPUT);
  SPI.begin(18, 19, 23, 5);

  int state = radio.begin();
  if (state != RADIOLIB_ERR_NONE) while(true);

  apply_pi_config();
  radio.startReceive();
  pinMode(26, INPUT);
  attachInterrupt(digitalPinToInterrupt(26), [](){ rx_flag = true; }, RISING);

  digitalWrite(LED_STATUS, HIGH);
  Serial.println("[READY] ESP32 ARQ Protocol - waiting for Pi...\n");
}

void loop() {
  static uint32_t last_hb = 0;
  if (millis() - last_hb > 3000) {
    last_hb = millis();
    Serial.printf("[LOOP] img=%s%s%s segs=%u/%u\n",
      have_img ? cur_mission : "none", have_img ? "/" : "", have_img ? cur_image : "",
      have_img ? (uint16_t)recv_segs.size() : 0, have_img ? cur_total : 0);
  }

  static uint32_t last_blink = 0; static bool blue_on = false;
  if (millis() - last_blink > 1000) { last_blink = millis(); blue_on = !blue_on; digitalWrite(LED_BLUE, blue_on); }

  if (rx_flag) {
    rx_flag = false;
    uint8_t buf[256];
    int len = radio.readData(buf, 256);
    if (len > 0) {
      int16_t rssi = radio.getRSSI();
      float snr = radio.getSNR();
      uint32_t t = millis();

      Serial.printf("[RX] t=%lums len=%d RSSI=%ddBm SNR=%.1fdB\n", t, len, rssi, snr);

      if (len >= HDR_SIZE) {
        uint8_t ver = buf[0], typ = buf[1];
        memcpy(cur_mission, &buf[2], 6); cur_mission[6] = 0;
        memcpy(cur_image, &buf[8], 6); cur_image[6] = 0;
        uint16_t chunk = (buf[14] << 8) | buf[15];
        uint16_t total = (buf[16] << 8) | buf[17];

        const char* tstr = "UNK";
        if (typ == PKT_DATA) tstr = "DATA";
        else if (typ == PKT_META) tstr = "META";
        else if (typ == PKT_STATUS) tstr = "STATUS";
        else if (typ == PKT_ACK) tstr = "ACK";
        else if (typ == PKT_NACK) tstr = "NACK";
        else if (typ == PKT_DONE) tstr = "DONE";
        Serial.printf("  %s | %s/%s chunk=%u/%u\n", tstr, cur_mission, cur_image, chunk, total);

        // New image?
        if (!have_img || strcmp(cur_mission, buf+2) != 0 || strcmp(cur_image, buf+8) != 0) {
          memcpy(cur_mission, &buf[2], 6); cur_mission[6] = 0;
          memcpy(cur_image, &buf[8], 6); cur_image[6] = 0;
          cur_total = total;
          recv_segs.clear();
          have_img = true;
          Serial.printf("[NEW] Image: %s/%s total_segs=%u\n", cur_mission, cur_image, total);
        }

        if (typ == PKT_META) {
          send_status(rssi, 0);
        } else if (typ == PKT_DATA) {
          recv_segs.insert(chunk);
          uint16_t recvd = recv_segs.size();
          Serial.printf("  [DATA] seg %u/%u -> recv %u/%u (%.0f%%)\n", chunk, total, recvd, total, 100.0*recvd/total);
          if (recvd % 4 == 0 || recvd >= total) send_status(rssi, 0);
          if (recvd >= total) { send_ack(); Serial.printf("[DONE] %s/%s fully received!\n", cur_mission, cur_image); have_img = false; }
        }
      }
    }
    radio.startReceive();
  }

  // Timeout NACK
  if (have_img && millis() - last_pkt > 8000 && recv_segs.size() < cur_total) {
    send_nack(); last_pkt = millis();
  }
}