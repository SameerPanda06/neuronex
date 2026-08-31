/*
 * test_esp32_comm.ino — ESP32 Full ARQ Protocol Test
 * Uses RadioLib high-level API (proven working for TX)
 * Receives META → DATA, sends STATUS/NACK/ACK
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
uint32_t crc32_calc(const uint8_t* data, size_t len) {
  return (~crc32_update(0xFFFFFFFF, data, len)) & 0xFFFFFFFF;
}

void send_status(int16_t rssi, float snr) {
  uint8_t payload[260];
  payload[0] = (cur_total >> 8) & 0xFF; payload[1] = cur_total & 0xFF;
  uint16_t recvd = recv_segs.size();
  payload[2] = (recvd >> 8) & 0xFF; payload[3] = recvd & 0xFF;
  uint8_t missing_count = 0;
  for (uint16_t s = 0; s < cur_total && missing_count < 255; s++) {
    if (recv_segs.find(s) == recv_segs.end()) payload[5 + missing_count++] = (uint8_t)s;
  }
  payload[4] = missing_count;

  uint8_t header[HDR_SIZE];
  header[0] = PROTO_VER; header[1] = PKT_STATUS;
  memcpy(&header[2], cur_mission, 6); memcpy(&header[8], cur_image, 6);
  header[14] = 0xFF; header[15] = 0xFF;
  header[16] = (cur_total >> 8) & 0xFF; header[17] = cur_total & 0xFF;
  memset(&header[20], 0, 16);

  uint32_t crc = crc32_update(0xFFFFFFFF, header, 20);
  crc = crc32_update(crc, payload, 5 + missing_count); crc = (~crc) & 0xFFFFFFFF;

  uint8_t pkt[HDR_SIZE + 260];
  memcpy(pkt, header, 20); memcpy(&pkt[20], (uint8_t*)&crc, 4); memcpy(&pkt[24], payload, 5 + missing_count);
  int st = radio.transmit(pkt, HDR_SIZE + 5 + missing_count);
  Serial.printf("[TX] STATUS: total=%u recvd=%u missing=%u (st=%d)\n", cur_total, recvd, missing_count, st);
  radio.startReceive();
}

void send_ack() {
  uint8_t header[HDR_SIZE];
  header[0] = PROTO_VER; header[1] = PKT_ACK;
  memcpy(&header[2], cur_mission, 6); memcpy(&header[8], cur_image, 6);
  header[14] = 0xFF; header[15] = 0xFF; header[16] = 0xFF; header[17] = 0xFF;
  memset(&header[20], 0, 16);
  uint32_t crc = crc32_update(0xFFFFFFFF, header, 20); crc = (~crc) & 0xFFFFFFFF;
  uint8_t pkt[HDR_SIZE];
  memcpy(pkt, header, 20); memcpy(&pkt[20], (uint8_t*)&crc, 4);
  int st = radio.transmit(pkt, HDR_SIZE);
  Serial.printf("[TX] ACK: COMPLETE (%u/%u) (st=%d)\n", cur_total, cur_total, st);
  radio.startReceive();
}

void setup() {
  Serial.begin(115200); delay(1000);
  pinMode(LED_STATUS, OUTPUT); pinMode(LED_BLUE, OUTPUT);
  SPI.begin(18, 19, 23, 5);

  int state = radio.begin();
  Serial.printf("radio.begin() = %d (0=OK)\n", state);
  if (state != RADIOLIB_ERR_NONE) { Serial.println("RADIO FAIL"); while(true); }

  // Match Pi backup.py config exactly via RadioLib high-level API
  radio.setFrequency(433.0);
  radio.setSpreadingFactor(7);
  radio.setBandwidth(125.0);
  radio.setCodingRate(5);
  radio.setSyncWord(0x12);
  radio.setPreambleLength(8);
  radio.setCRC(true);
  radio.setOutputPower(17);

  Serial.println("[CONFIG] 433MHz SF7 BW125 CR4/5 Sync=0x12 Preamble=8 CRC=ON");

  // Test: send self-test packet
  Serial.println("[TEST] Sending self-test packet...");
  uint8_t test_pkt[] = "SELF_TEST";
  int tx_st = radio.transmit(test_pkt, 9);
  Serial.printf("Self-test TX: %d\n", tx_st);
  delay(500);

  int rx_st = radio.startReceive();
  Serial.printf("startReceive() = %d (0=OK)\n", rx_st);

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
      int16_t rssi = radio.getRSSI(); float snr = radio.getSNR(); uint32_t t = millis();
      Serial.printf("[RX] t=%lums len=%d RSSI=%ddBm SNR=%.1fdB\n", t, len, rssi, snr);
      if (len >= HDR_SIZE) {
        uint8_t ver = buf[0], typ = buf[1];
        memcpy(cur_mission, &buf[2], 6); cur_mission[6] = 0;
        memcpy(cur_image, &buf[8], 6); cur_image[6] = 0;
        uint16_t chunk = (buf[14] << 8) | buf[15]; uint16_t total = (buf[16] << 8) | buf[17];
        const char* tstr = "UNK";
        if (typ == PKT_DATA) tstr = "DATA"; else if (typ == PKT_META) tstr = "META";
        else if (typ == PKT_STATUS) tstr = "STATUS"; else if (typ == PKT_ACK) tstr = "ACK";
        else if (typ == PKT_NACK) tstr = "NACK"; else if (typ == PKT_DONE) tstr = "DONE";
        Serial.printf("  %s | %s/%s chunk=%u/%u\n", tstr, cur_mission, cur_image, chunk, total);
        if (!have_img || strcmp(cur_mission, (const char*)buf+2) != 0 || strcmp(cur_image, (const char*)buf+8) != 0) {
          memcpy(cur_mission, &buf[2], 6); cur_mission[6] = 0;
          memcpy(cur_image, &buf[8], 6); cur_image[6] = 0;
          cur_total = total; recv_segs.clear(); have_img = true;
          Serial.printf("[NEW] Image: %s/%s total_segs=%u\n", cur_mission, cur_image, total);
        }
        if (typ == PKT_META) { send_status(rssi, 0); }
        else if (typ == PKT_DATA) {
          recv_segs.insert(chunk); uint16_t recvd = recv_segs.size();
          Serial.printf("  [DATA] seg %u/%u -> recv %u/%u (%.0f%%)\n", chunk, total, recvd, total, 100.0*recvd/total);
          if (recvd % 4 == 0 || recvd >= total) send_status(rssi, 0);
          if (recvd >= total) { send_ack(); Serial.printf("[DONE] %s/%s fully received!\n", cur_mission, cur_image); have_img = false; }
        }
      }
    } else { Serial.printf("[RX] readData error: %d\n", len); }
    radio.startReceive();
  }

  if (have_img && millis() - last_pkt > 8000 && recv_segs.size() < cur_total) {
    // send_nack(); last_pkt = millis(); // Uncomment when send_nack is implemented
  }
}