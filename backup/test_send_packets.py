#!/usr/bin/env python3
"""
test_send_packets.py — Send test LoRa packets to verify Pi TX → ESP32 RX link.
Run on Pi: python3 test_send_packets.py
"""
import sys
import time
sys.path.insert(0, '/home/sameer/neuronex/backup')
from backup import LoRa, build_data_packet, build_meta_packet

radio = LoRa()
if not radio.begin():
    print("[FAIL] Radio init failed")
    sys.exit(1)
print("Radio ready, sending 10 test packets...")

# Send META first
meta = build_meta_packet(b"NEX-000001", b"IMG-000001", {"class": "CLEAR", "confidence": 0.98, "action": "keep", "priority": 1, "jpeg_quality": 85}, 10)
try:
    radio.send_packet(meta)
    print("Sent META")
except Exception as e:
    print(f"Meta failed: {e}")
time.sleep(0.3)

# Send 10 DATA packets
for i in range(10):
    pkt = build_data_packet(b"NEX-000001", b"IMG-000001", i, 10, b"TEST" * 40)
    try:
        radio.send_packet(pkt)
        print(f"Sent DATA seg {i}")
    except Exception as e:
        print(f"Failed seg {i}: {e}")
    time.sleep(0.3)

print("Done - check ESP32 serial monitor")