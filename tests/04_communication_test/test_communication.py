#!/usr/bin/env python3
"""
test_communication.py — Full bidirectional protocol test
Tests: META → DATA → STATUS/NACK/ACK cycle
Run on Pi: sudo python3 test_communication.py
"""
import sys, time
sys.path.insert(0, '/home/sameer/neuronex/backup')
from backup import LoRa, build_meta_packet, build_data_packet

HEADER_SIZE = 36

radio = LoRa()
if not radio.begin():
    print("[FAIL] Radio init failed"); sys.exit(1)

print("[COMM TEST] Sending META + 6 DATA segments...")
print("ESP32 should reply with STATUS/NACK/ACK")

# Send META
meta = build_meta_packet(
    b"NEX-000001", b"IMG-000001",
    {"class": "CLEAR", "confidence": 0.98, "action": "keep", "priority": 1, "jpeg_quality": 85},
    6
)
radio.send_packet(meta)
print("[TX] META sent (6 segments)")
time.sleep(0.3)

# Send 6 DATA segments
for seg in range(6):
    pkt = build_data_packet(b"NEX-000001", b"IMG-000001", seg, 6, b"IMG_DATA_" + bytes([seg]) * 192)
    radio.send_packet(pkt)
    print(f"[TX] DATA seg {seg}/6")
    time.sleep(0.3)

print("[TX] All segments sent, listening for ESP32 reply...")

# Listen for STATUS/NACK/ACK
radio.start_rx()
received_ack = False
for i in range(30):
    payload, rssi, snr = radio.check_rx(1.0)
    if payload:
        print(f"[RX] len={len(payload)} RSSI={rssi}dBm SNR={snr:.1f}dB")
        if len(payload) >= HEADER_SIZE:
            ver, typ = payload[0], payload[1]
            mission = payload[2:8].decode('ascii', errors='ignore')
            image = payload[8:14].decode('ascii', errors='ignore')
            chunk = (payload[14] << 8) | payload[15]
            total = (payload[16] << 8) | payload[17]
            type_str = {0:"DATA",1:"ACK",2:"NACK",3:"META",4:"STATUS",5:"DONE"}.get(typ, "UNK")
            print(f"  {type_str} mission={mission} image={image} chunk={chunk}/{total}")
            if typ == 1:  # ACK
                received_ack = True
                print("  >>> ACK RECEIVED - Image transmission COMPLETE!")
                break
            elif typ == 4:  # STATUS
                recvd = (payload[20] << 8) | payload[21]
                missing = payload[24]
                print(f"  >>> STATUS: received={recvd}/{total} missing={missing}")
            elif typ == 2:  # NACK
                print("  >>> NACK RECEIVED - Missing segments requested")
    if i % 5 == 0:
        print(f"  ... {i}s elapsed")

if not received_ack:
    print("\n[RESULT] No ACK received - check ESP32 serial monitor")
else:
    print("\n[RESULT] Full handshake SUCCESS!")

print("[TEST COMPLETE]")