#!/usr/bin/env python3
"""
test_link.py — Full bidirectional radio link test using proven backup.py radio class.
1. Pi TX: sends packets, ESP32 receives
2. Pi RX: listens for ESP32 replies
Run: python3 test_link.py
"""
import sys
import time
import struct
sys.path.insert(0, '/home/sameer/neuronex/backup')
from backup import LoRa, HEADER_SIZE

radio = LoRa()
if not radio.begin():
    print("[FAIL] Radio init failed")
    sys.exit(1)

print("[TX TEST] Sending 10 packets every 0.5s...")
for i in range(10):
    # Build simple test packet (header + payload)
    header = bytearray(HEADER_SIZE)
    header[0] = 1      # version
    header[1] = 3      # type = META
    header[2:8] = b"NEX-000001"
    header[8:14] = b"IMG-000001"
    header[14] = (i >> 8) & 0xFF
    header[15] = i & 0xFF
    header[16] = 0x00
    header[17] = 0x0A
    pkt = bytes(header)
    radio.send_packet(pkt)
    print(f"  Sent pkt {i} (len={len(pkt)})")
    time.sleep(0.5)

print("[TX TEST] Done sending 10 packets")
print("[TX TEST] Now listen for reply for 10s...")

radio.start_rx()
for i in range(20):
    payload, rssi, snr = radio.check_rx(0.5)
    if payload:
        print(f"  [RX] len={len(payload)} RSSI={rssi}dBm SNR={snr:.1f}dB")
        if len(payload) >= HEADER_SIZE:
            ver = payload[0]
            typ = payload[1]
            mission = payload[2:8].decode('ascii', errors='ignore')
            image = payload[8:14].decode('ascii', errors='ignore')
            chunk = (payload[14] << 8) | payload[15]
            total = (payload[16] << 8) | payload[17]
            print(f"    ver={ver} type={typ} mission={mission} image={image} chunk={chunk}/{total}")
    if i % 4 == 0:
        print(f"  ... {i*0.5}s elapsed")

print("[TEST COMPLETE]")
