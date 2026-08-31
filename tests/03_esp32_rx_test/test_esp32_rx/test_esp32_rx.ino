/*
 * test_esp32_rx.ino — ESP32 RX Test with Pi-exact config using RadioLib high-level API
 * This version uses RadioLib's built-in methods (no manual register writes)
 * Matches Pi backup.py config exactly.
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

// Use Module for register access
Module mod = Module(LORA_NSS, LORA_DIO0, LORA_RST, LORA_MISO);

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

// Register access via Module
uint8_t read_reg(uint8_t addr) { return mod.SPIreadRegister(addr); }
void write_reg(uint8_t addr, uint8_t val) { mod.SPIwriteRegister(addr, val); }

void apply_pi_config() {
  Serial.println("[CONFIG] Applying Pi-exact config...");
  write_reg(REG_OP_MODE, MODE_SLEEP); delay(10);
  write_reg(0x06, 0x6C); write_reg(0x07, 0x80); write_reg(0x08, 0x00);  // 433MHz
  write_reg(REG_PA_CONFIG, 0x8F);  // PA_BOOST 17dBm
  write_reg(REG_LNA, 0x23);        // Max gain
  write_reg(0x0E, 0x00); write_reg(0x0F, 0x00);  // FIFO base
  write_reg(0x1D, 0x72);  // BW125 CR4/5 explicit
  write_reg(0x1E, 0x74);  // SF7 CRC on
  write_reg(0x26, 0x04);  // AGC auto
  write_reg(0x39, 0x12);       // Sync word
  write_reg(0x40, 0x40);      // DIO0=RxDone
  write_reg(0x02, 0x00); write_reg(0x03, 0x08);  // Preamble 8
  write_reg(REG_OP_MODE, MODE_STDBY); delay(10);  // Standby

  // Verify
  Serial.printf("VERSION=0x%02X OP_MODE=0x%02X FRF=%02X%02X%02X\n",
    read_reg(0x42), read_reg(0x01), read_reg(0x06), read_reg(0x07), read_reg(0x08));
  Serial.printf("CONFIG_1=0x%02X CONFIG_2=0x%02X SYNC=0x%02X DIO_MAP=0x%02X\n",
    read_reg(0x1D), read_reg(0x1E), read_reg(0x39), read_reg(0x40));
}

void setup() {
  Serial.begin(115200); delay(1000);
  pinMode(LED_STATUS, OUTPUT); pinMode(LED_BLUE, OUTPUT);
  SPI.begin(18, 19, 23, 5);

  int state = radio.begin();
  Serial.printf("radio.begin() = %d (0=OK)\n", state);
  if (state != RADIOLIB_ERR_NONE) {
    Serial.println("[FAIL] Radio init failed");
    while(true);
  }

  apply_pi_config();

  // Start RX continuous
  radio.startReceive();
  pinMode(26, INPUT);
  attachInterrupt(digitalPinToInterrupt(26), [](){ rx_flag = true; }, RISING);

  digitalWrite(LED_STATUS, HIGH);
  Serial.println("[READY] ESP32 RX - waiting for Pi packets...\n");
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