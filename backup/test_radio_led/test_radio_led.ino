/*
 * test_radio_led.ino — ESP32 Radio Test with Pi-EXACT Register Config
 * Uses RadioLib's Module directly for register access
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

// Use Module directly for low-level register access
Module mod = Module(LORA_NSS, LORA_DIO0, LORA_RST, LORA_MISO);

// SX1278 Registers (match backup.py exactly)
#define REG_FIFO                    0x00
#define REG_OP_MODE                 0x01
#define REG_FRF_MSB                 0x06
#define REG_FRF_MID                 0x07
#define REG_FRF_LSB                 0x08
#define REG_PA_CONFIG               0x09
#define REG_LNA                     0x0C
#define REG_FIFO_ADDR_PTR           0x0D
#define REG_FIFO_TX_BASE_ADDR       0x0E
#define REG_FIFO_RX_BASE_ADDR       0x0F
#define REG_IRQ_FLAGS               0x12
#define REG_RX_NB_BYTES             0x13
#define REG_PKT_SNR_VALUE           0x19
#define REG_PKT_RSSI_VALUE          0x1A
#define REG_MODEM_CONFIG_1          0x1D
#define REG_MODEM_CONFIG_2          0x1E
#define REG_MODEM_CONFIG_3          0x26
#define REG_PAYLOAD_LENGTH          0x22
#define REG_SYNC_WORD               0x39
#define REG_DIO_MAPPING_1           0x40
#define REG_VERSION                 0x42

#define MODE_SLEEP                  0x80
#define MODE_STDBY                  0x81
#define MODE_TX                     0x83
#define MODE_RX_CONT                0x85

SX1278 radio = new Module(LORA_NSS, LORA_DIO0, LORA_RST);

volatile bool rx_flag = false;
void IRAM_ATTR onRx() { rx_flag = true; }

// Low-level register access via Module
uint8_t read_reg(uint8_t addr) {
  return mod.SPIreadRegister(addr);
}

void write_reg(uint8_t addr, uint8_t val) {
  mod.SPIwriteRegister(addr, val);
}

void setup() {
  Serial.begin(115200);
  uint32_t t0 = millis();
  while (!Serial && millis() - t0 < 3000) delay(10);

  Serial.println("\n=== ESP32 RADIO TEST - Pi EXACT CONFIG ===");
  Serial.println("Config: 433MHz SF7 BW125 CR4/5 Sync=0x12\n");

  pinMode(LED_STATUS, OUTPUT); pinMode(LED_BLUE, OUTPUT);
  digitalWrite(LED_STATUS, LOW); digitalWrite(LED_BLUE, LOW);

  SPI.begin(18, 19, 23, 5);

  // Initialize RadioLib high-level driver
  int state = radio.begin();
  Serial.printf("[INIT] radio.begin() = %d (0=OK)\n", state);
  if (state != RADIOLIB_ERR_NONE) {
    Serial.println("[FAIL] Radio init failed");
    while (true) { digitalWrite(LED_STATUS, !digitalRead(LED_STATUS)); delay(200); }
  }
  Serial.println("[OK] Radio hardware detected");

  // ======== APPLY Pi EXACT CONFIG via direct register writes ========
  Serial.println("\n[CONFIG] Applying Pi exact register config...");

  // 1. Sleep mode first
  write_reg(REG_OP_MODE, MODE_SLEEP); delay(10);

  // 2. Frequency 433 MHz (frf = 433000000 / 61.03515625 = 0x6C8000)
  write_reg(0x06, 0x6C);  // FRF_MSB
  write_reg(0x07, 0x80);  // FRF_MID
  write_reg(0x08, 0x00);  // FRF_LSB
  Serial.println("  Frequency: 433.0 MHz");

  // 3. PA_CONFIG: PA_BOOST, 17 dBm (0x8F)
  write_reg(0x09, 0x8F);
  Serial.println("  PA_CONFIG: 0x8F (PA_BOOST, 17 dBm)");

  // 4. LNA: max gain, boost on (0x23)
  write_reg(0x0C, 0x23);
  Serial.println("  LNA: 0x23 (max gain)");

  // 5. FIFO base addresses
  write_reg(0x0E, 0x00);  // TX base
  write_reg(0x0F, 0x00);  // RX base
  Serial.println("  FIFO base: 0x00");

  // 6. MODEM_CONFIG_1: BW125 + CR4/5 + explicit header (0x72)
  write_reg(0x1D, 0x72);
  Serial.println("  MODEM_CONFIG_1: 0x72 (BW125 CR4/5 explicit)");

  // 7. MODEM_CONFIG_2: SF7 + CRC on (0x74)
  write_reg(0x1E, 0x74);
  Serial.println("  MODEM_CONFIG_2: 0x74 (SF7 CRC on)");

  // 8. MODEM_CONFIG_3: AGC auto (0x04)
  write_reg(0x26, 0x04);
  Serial.println("  MODEM_CONFIG_3: 0x04 (AGC auto)");

  // 9. Sync word: 0x12
  write_reg(0x39, 0x12);
  Serial.println("  SYNC_WORD: 0x12");

  // 10. DIO0 mapping: RxDone (0x40)
  write_reg(0x40, 0x40);
  Serial.println("  DIO_MAPPING_1: 0x40 (DIO0=RxDone)");

  // 11. Preamble length: 8
  write_reg(0x02, 0x00);
  write_reg(0x03, 0x08);
  Serial.println("  Preamble: 8");

  // 12. Enter standby
  write_reg(REG_OP_MODE, MODE_STDBY); delay(10);
  Serial.println("  Mode: STDBY");

  // Verify key registers
  Serial.println("\n[VERIFY] Key registers:");
  Serial.printf("  VERSION (0x42): 0x%02X (expect 0x12)\n", read_reg(REG_VERSION));
  Serial.printf("  OP_MODE (0x01): 0x%02X (expect 0x81)\n", read_reg(REG_OP_MODE));
  Serial.printf("  FRF: 0x%02X%02X%02X (expect 0x6C8000)\n", read_reg(0x06), read_reg(0x07), read_reg(0x08));
  Serial.printf("  PA_CONFIG (0x09): 0x%02X\n", read_reg(REG_PA_CONFIG));
  Serial.printf("  MODEM_CONFIG_1 (0x1D): 0x%02X\n", read_reg(REG_MODEM_CONFIG_1));
  Serial.printf("  MODEM_CONFIG_2 (0x1E): 0x%02X\n", read_reg(REG_MODEM_CONFIG_2));
  Serial.printf("  SYNC_WORD (0x39): 0x%02X\n", read_reg(REG_SYNC_WORD));
  Serial.printf("  DIO_MAPPING_1 (0x40): 0x%02X\n", read_reg(REG_DIO_MAPPING_1));

  // Start RX continuous mode
  write_reg(REG_FIFO_ADDR_PTR, 0x00);
  write_reg(REG_OP_MODE, MODE_RX_CONT);
  Serial.println("\n[READY] Radio in RX continuous mode");

  // Attach DIO0 interrupt
  pinMode(26, INPUT);
  attachInterrupt(digitalPinToInterrupt(26), [](){}, RISING);
  Serial.println("[READY] Listening with DIO0 interrupt...\n");

  pinMode(LED_STATUS, OUTPUT); pinMode(LED_BLUE, OUTPUT);
  digitalWrite(LED_STATUS, HIGH);
}

void loop() {
  static uint32_t last_hb = 0;
  if (millis() - last_hb > 3000) {
    last_hb = millis();
    Serial.println("[LOOP] Alive - waiting for packets...");
  }

  static uint32_t last_blink = 0; static bool blue_on = false;
  if (millis() - last_blink > 1000) { last_blink = millis(); blue_on = !blue_on; digitalWrite(LED_BLUE, blue_on); }

  // Poll DIO0 pin (interrupt sets flag but we'll also poll)
  if (digitalRead(26) == HIGH) {
    uint8_t buf[256];
    int len = radio.readData(buf, 256);
    if (len > 0) {
      int16_t rssi = radio.getRSSI();
      float snr = radio.getSNR();
      digitalWrite(LED_BLUE, HIGH); delay(80); digitalWrite(LED_BLUE, LOW);
      Serial.printf("[RX] len=%d RSSI=%ddBm SNR=%.1fdB\n", len, rssi, snr);
      Serial.print("  Data: ");
      for (int i = 0; i < min(len, 32); i++) Serial.printf("%02X ", buf[i]);
      if (len > 32) Serial.print("...");
      Serial.println();
    } else if (len == 0) {
      Serial.println("[RX] readData returned 0");
    } else {
      Serial.printf("[RX] readData error: %d\n", len);
    }
    radio.startReceive();
  }
}