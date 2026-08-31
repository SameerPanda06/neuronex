#!/usr/bin/env python3
"""Quick Pi RX test - listen for packets from ESP32 TX"""
import spidev, time

spi = spidev.SpiDev()
spi.open(0, 0)
spi.max_speed_hz = 100000
spi.mode = 0

# Set Pi SX1278 to LoRa RX mode (same config as backup.py)
spi.xfer2([0x01 | 0x80, 0x88])  # LoRa mode + standby
time.sleep(0.05)
# Set frequency 433 MHz
spi.xfer2([0x06 | 0x80, 0x6C])
spi.xfer2([0x07 | 0x80, 0x80])
spi.xfer2([0x08 | 0x80, 0x00])
# Set modem config: BW125 CR4/5 explicit header
spi.xfer2([0x1D | 0x80, 0x72])
# SF7 + CRC on
spi.xfer2([0x1E | 0x80, 0x74])
# AGC auto
spi.xfer2([0x26 | 0x80, 0x04])
# Sync word 0x12
spi.xfer2([0x39 | 0x80, 0x12])
# PA_BOOST 17 dBm
spi.xfer2([0x09 | 0x80, 0x8F])
# DIO0 = RxDone
spi.xfer2([0x40 | 0x80, 0x00])
# Preamble 8
spi.xfer2([0x02 | 0x80, 0x00])
spi.xfer2([0x03 | 0x80, 0x08])

# Enter RX continuous mode
spi.xfer2([0x01 | 0x80, 0x8D])
print("Pi SX1278 in RX mode - listening for ESP32 packets...")
print("Make sure ESP32 test_esp32_tx sketch is running!")
print("Waiting 15 seconds...\n")

received = 0
for i in range(30):
    irq = spi.xfer2([0x12 & 0x7F, 0x00])[1]
    if irq & 0x40:  # RX_DONE
        # Read FIFO
        spi.xfer2([0x0D | 0x80, 0x00])  # FIFO RX base
        len_resp = spi.xfer2([0x13 & 0x7F, 0x00])
        pkt_len = len_resp[1]
        print(f"RECEIVED packet! Length={pkt_len} IRQ=0x{irq:02X}")
        # Read packet
        data = spi.xfer2([0x00 & 0x7F] + [0x00] * min(pkt_len, 64))
        print(f"  Data: {' '.join(f'{b:02X}' for b in data[1:pkt_len+1])}")
        rssi_resp = spi.xfer2([0x1A & 0x7F, 0x00])
        rssi = rssi_resp[1] - 157
        print(f"  RSSI: {rssi} dBm")
        received += 1
        # Clear IRQ
        spi.xfer2([0x12 | 0x80, 0xFF])
        spi.xfer2([0x01 | 0x80, 0x8D])  # Restart RX
    if i % 5 == 0:
        print(f"  ... {i*0.5}s elapsed, {received} packets so far")
    time.sleep(0.5)

print(f"\nDone: {received} packets received in 15 seconds")
spi.close()
