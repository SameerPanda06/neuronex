#!/usr/bin/env python3
"""
Pi RX Test — Verify Pi SX1278 can receive packets from ESP32
Run: sudo python3 test_pi_rx.py
"""
import sys, time
sys.path.insert(0, '/home/sameer/neuronex/backup')
from backup import LoRa

radio = LoRa()
if not radio.begin():
    print("[FAIL] Radio init failed")
    sys.exit(1)

print("[Pi RX TEST] Listening for 30 seconds...")
print("Flash ESP32 with test_esp32_tx.ino (sends 'TEST' every 1s)")
radio.start_rx()

received = 0
for i in range(60):
    payload, rssi, snr = radio.check_rx(0.5)
    if payload:
        received += 1
        print(f"[RX #{received}] len={len(payload)} RSSI={rssi}dBm SNR={snr:.1f}dB")
        print(f"  Data: {payload.hex()}")
    if i % 10 == 0:
        print(f"  ... {i*0.5}s elapsed, {received} packets")

print(f"\n[TEST COMPLETE] Received {received} packets in 30s")
print("EXPECTED: ~30 packets if link works")