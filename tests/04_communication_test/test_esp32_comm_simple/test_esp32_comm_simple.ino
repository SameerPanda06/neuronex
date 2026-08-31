/*
 * test_esp32_comm_simple.ino — ESP32 ARQ Protocol Test using RadioLib's receive() method
 * Matches Pi backup.py config exactly via RadioLib methods
 */
#include <Arduino.h>
#include <SPI.h>
#include <RadioLib.h>

#define LORA_NSS    5
#define LORA_RST    14
#define LORA_DIO0   26
#define LORA_MOSI   23
#define LORA_MISO   19
#define LORA_SCK    18
#define LED_STATUS  2
#define LED_BLUE    13

// Use Module for register access (but we'll let RadioLib handle it)
SX1278 radio = new Module(LORA_NSS, LORA_DIO0, LORA_RST);

volatile bool rx_flag = false;
void IRAM_ATTR onRx() { rx_flag = true; }

void setup() {
  Serial.begin(115200); delay(1000);
  pinMode(LED_STATUS, OUTPUT); pinMode(LED_BLUE, OUTPUT);
  SPI.begin(18, 19, 23, 5);

  // Use RadioLib HIGH-LEVEL config (matches Pi backup.py exactly)
  int state = radio.begin();
  Serial.printf("radio.begin() = %d (0=OK)\n", state);
  if (state != RADIOLIB_ERR_NONE) {
    Serial.println("[FAIL] Radio init failed"); while(true);
  }

  // Match Pi backup.py EXACTLY:
  radio.setFrequency(433.0);           // 433.0 MHz
  radio.setSpreadingFactor(7);         // SF7
  radio.setBandwidth(125.0);           // BW125
  radio.setCodingRate(5);              // CR4/5
  radio.setSyncWord(0x12);             // Sync word 0x12
  radio.setPreambleLength(8);          // Preamble 8
  radio.setCRC(true);                  // CRC ON
  radio.setOutputPower(17);            // 17 dBm

  // Explicit header mode (Pi uses explicit)
  radio.setHeaderType(RADIOLIB_SX126X_LORA_HEADER_EXPLICIT);

  Serial.println("[CONFIG] RadioLib config applied:");
  Serial.println("  433MHz SF7 BW125 CR4/5 Sync=0x12 Preamble=8 CRC=ON Explicit");

  // Start RX continuous
  int rx_st = radio.startReceive();
  Serial.printf("startReceive() = %d (0=OK)\n", rx_st);

  // Attach interrupt
  pinMode(26, INPUT);
  attachInterrupt(digitalPinToInterrupt(26), [](){ rx_flag = true; }, RISING);

  pinMode(LED_STATUS, OUTPUT); pinMode(LED_BLUE, OUTPUT);
  digitalWrite(LED_STATUS, HIGH);
  Serial.println("[READY] ESP32 ARQ Protocol - waiting for Pi packets...\n");
}

void loop() {
  static uint32_t last_hb = 0;
  if (millis() - last_hb > 3000) {
    last_hb = millis();
    Serial.printf("[LOOP] Alive | DIO0=%d\n", digitalRead(26));
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
      Serial.print("  Data: ");
      for (int i = 0; i < min(len, 32); i++) Serial.printf("%02X ", buf[i]);
      if (len > 32) Serial.print("...");
      Serial.println();

      // Try to parse protocol header
      if (len >= 20) {
        Serial.printf("  HDR: ver=%d type=%d mission=%.6s image=%.6s seg=%d/%d\n",
          buf[0], buf[1], (char*)&buf[2], (char*)&buf[8], (buf[14]<<8)|buf[15], (buf[16]<<8)|buf[17]);
      }
    } else {
      Serial.printf("[RX] readData error: %d\n", len);
    }
    radio.startReceive();
  }
}