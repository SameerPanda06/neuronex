/*
 * test_esp32_tx.ino — ESP32 TX Test
 * Sends "TEST" packet every 1 second
 * Pins: NSS=5, RST=14, DIO0=26, MOSI=23, MISO=19, SCK=18
 */
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

SX1278 radio = new Module(LORA_NSS, LORA_DIO0, LORA_RST);

void setup() {
  Serial.begin(115200); delay(1000);
  pinMode(LED_STATUS, OUTPUT); pinMode(LED_BLUE, OUTPUT);
  SPI.begin(18, 19, 23, 5);

  int state = radio.begin();
  Serial.printf("radio.begin() = %d (0=OK)\n", state);
  if (state != RADIOLIB_ERR_NONE) while(true);

  radio.setFrequency(433.0);
  radio.setSpreadingFactor(7);
  radio.setBandwidth(125.0);
  radio.setCodingRate(5);
  radio.setSyncWord(0x12);
  radio.setPreambleLength(8);
  radio.setCRC(true);
  radio.setOutputPower(17);
  Serial.println("TX ready - sending 'TEST' every 1s");
}

void loop() {
  uint8_t pkt[] = "TEST";
  int st = radio.transmit(pkt, 4);
  Serial.printf("TX: %d RSSI=%ddBm\n", st, radio.getRSSI());
  digitalWrite(LED_STATUS, HIGH); delay(50); digitalWrite(LED_STATUS, LOW);
  delay(1000);
}