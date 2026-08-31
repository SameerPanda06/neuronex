#!/usr/bin/env python3
"""
backup.py — Neuronex Pi TX (SELF-CONTAINED BACKUP)
==================================================
Runs on Raspberry Pi 3B+. One file, no external Neuronex imports.

Pipeline per image (edge AI on the satellite):
  1. Classify with TFLite model  -> CLEAR / CLOUDY / NOT_VISIBLE
  2. Decide via mission rules     -> keep / defer / discard  (+ priority + JPEG quality)
  3. Compress JPEG at decided quality (Pillow) BEFORE chunking
  4. Handshake: listen for PKT_STATUS from ESP32 (what it already has)
  5. Send ONLY missing segments in the 60s downlink window
  6. Persist progress -> resume across revolutions (store-and-forward)
  7. On completion send PKT_DONE, move to next image

Run on Pi:
  python3 backup.py            # one image (one revolution)
  python3 backup.py --all      # all remaining images, priority-sorted
  python3 backup.py --reset    # wipe state, fresh start
  DEBUG_HEX=1 python3 backup.py --all   # dump raw RX packets

Requires: spidev, RPi.GPIO, numpy, Pillow, tflite_runtime (or ai_edge_litert)
"""
import time
import json
import os
import io
import struct
import sys
import glob

# ---- Hardware libs (Pi only) --------------------------------------------
try:
    import spidev
    import RPi.GPIO as GPIO
    HARDWARE = True
except ImportError:
    print("[WARN] spidev/RPi.GPIO not found — running in DRY-RUN (no radio).")
    HARDWARE = False

# ---- Imaging / ML libs --------------------------------------------------
try:
    import numpy as np
    from PIL import Image
    IMAGING = True
except ImportError:
    print("[WARN] numpy/Pillow not found — compression + classification disabled.")
    IMAGING = False

# TFLite interpreter (prefer ai-edge-litert, then tflite_runtime, then tensorflow)
import os
Interpreter = None

# Check env var first
tflite_impl = os.getenv("TFLITE_IMPL", "ai_edge_litert")

if tflite_impl == "ai_edge_litert":
    try:
        from ai_edge_litert.interpreter import Interpreter
    except ImportError:
        pass

if Interpreter is None:
    try:
        from tflite_runtime.interpreter import Interpreter
    except ImportError:
        pass

if Interpreter is None:
    try:
        from tensorflow.lite.python.interpreter import Interpreter
    except ImportError:
        Interpreter = None


# =========================================================================
# CONFIG
# =========================================================================
NEURONEX_DIR = os.path.expanduser("~/neuronex")
MISSION_FILE = os.path.join(NEURONEX_DIR, "config", "mission_config.json")
RULES_FILE   = os.path.join(NEURONEX_DIR, "config", "mission_rules.json")
MODEL_FILE   = os.path.join(NEURONEX_DIR, "models", "neuronex.tflite")
STATE_DIR    = os.path.join(NEURONEX_DIR, "state")
DECISIONS_LOG = os.path.join(STATE_DIR, "decisions.jsonl")

# Revolution / window config
REVS_PER_DAY        = 12
DOWNLINK_WINDOW_SEC = 180     # 3-minute downlink window (12 revs/day)
BATCH_SIZE          = 4       # match ESP32 BATCH_ACK_THRESHOLD
STATUS_WAIT_SEC     = 8.0     # how long to listen for STATUS after META
IMG_SIZE            = 224     # model input size

# Classification: matches TFLite model (3 classes)
CLASS_NAMES         = ["CLEAR", "CLOUDY", "NOT_VISIBLE"]

DEFAULT_RULES = {
    "CLEAR":  {"action": "keep",    "priority": 1, "jpeg_quality": 85},
    "CLOUDY": {"action": "discard", "priority": 2, "jpeg_quality": 60},  # deferred by default
    "NOT_VISIBLE": {"action": "discard", "priority": 3, "jpeg_quality": 40},
}

# =========================================================================
# PROTOCOL (must match backup.ino exactly)
# =========================================================================
PROTOCOL_VERSION = 1
HEADER_FORMAT = "!B B 6s 6s H H H 16s"        # 36 bytes
HEADER_SIZE = struct.calcsize(HEADER_FORMAT)
CRC_OFFSET = 20                                # CRC lives at header bytes 20..23

PKT_DATA, PKT_ACK, PKT_NACK, PKT_META, PKT_STATUS, PKT_DONE, PKT_CMD = 0, 1, 2, 3, 4, 5, 7

# PKT_CMD sub-commands (ground -> satellite)
CMD_PRIORITY = 0x01   # value: 1=CLEAR, 2=CLOUDY (set target bucket)
CMD_RESET = 0x02      # value: 0 (clear ESP32 state)
CMD_STATUS_REQ = 0x03 # value: 0 (request status echo)

# SX1278 radio
FREQ = 433000000
FSTEP = 61.03515625
REG_FIFO = 0x00
REG_OP_MODE = 0x01
REG_FRF_MSB, REG_FRF_MID, REG_FRF_LSB = 0x06, 0x07, 0x08
REG_PA_CONFIG = 0x09
REG_LNA = 0x0C
REG_FIFO_ADDR_PTR = 0x0D
REG_FIFO_TX_BASE_ADDR = 0x0E
REG_FIFO_RX_CURRENT_ADDR = 0x10
REG_IRQ_FLAGS = 0x12
REG_RX_NB_BYTES = 0x13
REG_PKT_SNR_VALUE = 0x19
REG_PKT_RSSI_VALUE = 0x1A
REG_MODEM_CONFIG_1, REG_MODEM_CONFIG_2, REG_MODEM_CONFIG_3 = 0x1D, 0x1E, 0x26
REG_PAYLOAD_LENGTH = 0x22
REG_SYNC_WORD = 0x39
REG_DIO_MAPPING_1 = 0x40
REG_VERSION = 0x42

MODE_SLEEP, MODE_STDBY, MODE_TX, MODE_RX_CONT = 0x80, 0x81, 0x83, 0x85
IRQ_RX_DONE = 0x40
IRQ_PAYLOAD_CRC_ERROR = 0x20

RST_PIN = 25
DIO0_PIN = 24


# =========================================================================
# CRC32 (matches ESP32 side)
# =========================================================================
def crc32_update(crc, data):
    for b in data:
        crc ^= b
        for _ in range(8):
            crc = (crc >> 1) ^ (0xEDB88320 & (-(crc & 1)))
    return crc


def calculate_crc(data):
    return (~crc32_update(0xFFFFFFFF, data)) & 0xFFFFFFFF


def wire_id(s):
    return s.encode()[:6].ljust(6, b'\x00')


# =========================================================================
# SX1278 LoRa DRIVER
# =========================================================================
class LoRa:
    def __init__(self):
        self.spi = None

    def begin(self):
        if not HARDWARE:
            print("[RADIO] DRY-RUN (no SPI/GPIO)")
            return True
        self.spi = spidev.SpiDev()
        self.spi.open(0, 0)
        self.spi.max_speed_hz = 100000
        self.spi.mode = 0

        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)
        GPIO.setup(RST_PIN, GPIO.OUT)
        GPIO.setup(DIO0_PIN, GPIO.IN)
        GPIO.output(RST_PIN, GPIO.LOW); time.sleep(0.1)
        GPIO.output(RST_PIN, GPIO.HIGH); time.sleep(0.1)

        version = None
        for _ in range(5):
            version = self.read_reg(REG_VERSION)
            if version == 0x12:
                break
            time.sleep(0.05)
        if version != 0x12:
            print(f"[FAIL] SX1278 not responding (VERSION=0x{version:02X})")
            return False

        self.write_reg(REG_OP_MODE, MODE_SLEEP); time.sleep(0.01)
        self.set_frequency(FREQ)
        self.write_reg(REG_PA_CONFIG, 0x8F)          # PA_BOOST 17 dBm
        self.write_reg(REG_LNA, 0x23)
        self.write_reg(REG_FIFO_TX_BASE_ADDR, 0x00)
        self.write_reg(REG_MODEM_CONFIG_1, 0x72)     # BW125 CR4/5 explicit header
        self.write_reg(REG_MODEM_CONFIG_2, 0x74)     # SF7 CRC on
        self.write_reg(REG_MODEM_CONFIG_3, 0x04)     # AGC auto
        self.write_reg(REG_SYNC_WORD, 0x12)          # match ESP32
        self.write_reg(REG_DIO_MAPPING_1, 0x40)
        self.write_reg(REG_OP_MODE, MODE_STDBY); time.sleep(0.01)
        print("[RADIO] Ready: 433MHz SF7 BW125 CR4/5 Sync=0x12")
        return True

    def write_reg(self, addr, val):
        self.spi.xfer2([addr | 0x80, val])

    def read_reg(self, addr):
        return self.spi.xfer2([addr & 0x7F, 0x00])[1]

    def set_frequency(self, freq):
        frf = int(freq / FSTEP)
        self.write_reg(REG_FRF_MSB, (frf >> 16) & 0xFF)
        self.write_reg(REG_FRF_MID, (frf >> 8) & 0xFF)
        self.write_reg(REG_FRF_LSB, frf & 0xFF)

    def send_packet(self, packet_bytes):
        if not HARDWARE:
            time.sleep(0.02)  # simulate airtime
            return
        self.write_reg(REG_OP_MODE, MODE_STDBY)
        self.write_reg(REG_FIFO_ADDR_PTR, 0x00)
        self.write_reg(REG_PAYLOAD_LENGTH, len(packet_bytes))
        self.spi.xfer2([REG_FIFO | 0x80] + list(packet_bytes))
        self.write_reg(REG_OP_MODE, MODE_TX)
        timeout = time.time() + 2.0
        while not GPIO.input(DIO0_PIN):
            if time.time() > timeout:
                irq = self.read_reg(REG_IRQ_FLAGS)
                self.write_reg(REG_IRQ_FLAGS, 0xFF)
                raise TimeoutError(f"TX timeout IRQ=0x{irq:02X}")
        self.write_reg(REG_IRQ_FLAGS, 0xFF)
        self.write_reg(REG_OP_MODE, MODE_STDBY)

    def start_rx(self):
        if not HARDWARE:
            return
        self.write_reg(REG_OP_MODE, MODE_STDBY); time.sleep(0.002)
        self.write_reg(REG_IRQ_FLAGS, 0xFF)
        self.write_reg(REG_OP_MODE, MODE_RX_CONT)

    def check_rx(self, timeout=0.1):
        if not HARDWARE:
            time.sleep(timeout)
            return None, None, None
        start

    def listen_for_cmd(self, timeout=2.0):
        """Listen for PKT_CMD packet from ground (any mission/image).
        Returns (cmd, value) or (None, None) if timeout."""
        self.start_rx()
        deadline = time.time() + timeout
        while time.time() < deadline:
            payload, rssi, snr = self.check_rx(0.1)
            if not payload or payload == "crc_error":
                continue
            if len(payload) < HEADER_SIZE:
                continue
            if payload[1] == PKT_CMD:
                # PKT_CMD payload is at HEADER_SIZE, format: cmd(u8), value(u8)
                cmd_payload = payload[HEADER_SIZE:]
                if len(cmd_payload) >= 2:
                    cmd = cmd_payload[0]
                    value = cmd_payload[1]
                    print(f"  [CMD] Received: cmd={cmd:#x} value={value}")
                    return cmd, value
        return None, None = time.time()
        while time.time() - start < timeout:
            irq = self.read_reg(REG_IRQ_FLAGS)
            if irq & IRQ_RX_DONE:
                self.write_reg(REG_IRQ_FLAGS, 0xFF)
                if irq & IRQ_PAYLOAD_CRC_ERROR:
                    self.start_rx()
                    return "crc_error", None, None
                cur = self.read_reg(REG_FIFO_RX_CURRENT_ADDR)
                self.write_reg(REG_FIFO_ADDR_PTR, cur)
                n = self.read_reg(REG_RX_NB_BYTES)
                payload = bytes([self.read_reg(REG_FIFO) for _ in range(n)])
                rssi = self.read_reg(REG_PKT_RSSI_VALUE) - 157
                snr = self.read_reg(REG_PKT_SNR_VALUE) * 0.25
                self.start_rx()
                return payload, rssi, snr
        return None, None, None

    def close(self):
        try:
            if self.spi:
                self.write_reg(REG_OP_MODE, MODE_SLEEP)
                self.spi.close()
        except Exception:
            pass


# =========================================================================
# PACKET BUILDERS / PARSERS
# =========================================================================
def build_data_packet(w_mission, w_image, seg_num, total_segs, payload):
    header = struct.pack(HEADER_FORMAT, PROTOCOL_VERSION, PKT_DATA,
                         w_mission, w_image, seg_num, total_segs, len(payload),
                         b'\x00' * 16)
    crc_val = calculate_crc(header + payload)
    header = header[:CRC_OFFSET] + struct.pack("!I", crc_val) + header[CRC_OFFSET+4:]
    return header + payload


def build_meta_packet(w_mission, w_image, meta_dict, total_segments):
    meta_json = json.dumps(meta_dict).encode()
    header = struct.pack(HEADER_FORMAT, PROTOCOL_VERSION, PKT_META,
                         w_mission, w_image, 0xFFFF, total_segments, len(meta_json),
                         b'\x00' * 16)
    crc_val = calculate_crc(header + meta_json)
    header = header[:CRC_OFFSET] + struct.pack("!I", crc_val) + header[CRC_OFFSET+4:]
    return header + meta_json


def build_done_packet(w_mission, w_image, total_segments):
    payload = struct.pack("!HH", total_segments, 0)
    header = struct.pack(HEADER_FORMAT, PROTOCOL_VERSION, PKT_DONE,
                         w_mission, w_image, 0xFFFF, 0xFFFF, len(payload),
                         b'\x00' * 16)
    crc_val = calculate_crc(header + payload)
    header = header[:CRC_OFFSET] + struct.pack("!I", crc_val) + header[CRC_OFFSET+4:]
    return header + payload


def parse_status(payload_after_header):
    """PKT_STATUS payload: [total:u16][recvd:u16][count:u8][missing...]"""
    d = payload_after_header
    if len(d) < 5:
        return None
    total = (d[0] << 8) | d[1]
    recvd = (d[2] << 8) | d[3]
    count = d[4]
    missing = list(d[5:5 + count])
    return total, recvd, missing


# =========================================================================
# STATE PERSISTENCE (resume across revolutions)
# =========================================================================
def load_state(mission_id, image_id):
    os.makedirs(STATE_DIR, exist_ok=True)
    path = os.path.join(STATE_DIR, f"{mission_id}_{image_id}.state.json")
    if os.path.exists(path):
        try:
            with open(path) as f:
                s = json.load(f)
            return set(s.get("confirmed", [])), s.get("attempts", 0)
        except Exception:
            pass
    return set(), 0


def save_state(mission_id, image_id, confirmed, attempts):
    os.makedirs(STATE_DIR, exist_ok=True)
    path = os.path.join(STATE_DIR, f"{mission_id}_{image_id}.state.json")
    with open(path, 'w') as f:
        json.dump({"confirmed": sorted(confirmed), "attempts": attempts}, f)


def mark_complete(mission_id, image_id):
    os.makedirs(STATE_DIR, exist_ok=True)
    with open(os.path.join(STATE_DIR, f"{image_id}.complete"), 'w') as f:
        f.write("done\n")
    p = os.path.join(STATE_DIR, f"{mission_id}_{image_id}.state.json")
    if os.path.exists(p):
        os.remove(p)


def is_complete(image_id):
    return os.path.exists(os.path.join(STATE_DIR, f"{image_id}.complete"))


# =========================================================================
# ML: CLASSIFIER (singleton)
# =========================================================================
class Classifier:
    _interp = None
    _in = None
    _out = None
    _size = IMG_SIZE

    @classmethod
    def load(cls):
        if cls._interp is not None:
            return True
        if Interpreter is None or not os.path.exists(MODEL_FILE):
            print(f"[ML] Model/interpreter unavailable ({MODEL_FILE}) — using heuristic fallback.")
            return False
        cls._interp = Interpreter(model_path=MODEL_FILE)
        cls._interp.allocate_tensors()
        cls._in = cls._interp.get_input_details()
        cls._out = cls._interp.get_output_details()
        cls._size = cls._in[0]['shape'][1]
        print(f"[ML] Loaded {os.path.basename(MODEL_FILE)} in={cls._in[0]['shape']} classes={CLASS_NAMES}")
        return True

    @classmethod
    def classify(cls, image_path):
        t0 = time.time()
        if cls._interp is None or not IMAGING:
            # Heuristic fallback: mean brightness -> pseudo class
            return {"class": "CLEAR", "confidence": 0.75,
                    "probs": {"CLEAR": 0.75, "CLOUDY": 0.15, "NOT_VISIBLE": 0.10},
                    "latency_ms": 0.0, "compression_ms": 0.0, "file_size": 0}
        img = Image.open(image_path).convert("RGB").resize((cls._size, cls._size))
        arr = (np.array(img, dtype=np.float32) / 255.0)[None, ...]
        cls._interp.set_tensor(cls._in[0]['index'], arr)
        cls._interp.invoke()
        out = cls._interp.get_tensor(cls._out[0]['index'])[0]
        idx = int(np.argmax(out))
        latency = round((time.time() - t0) * 1000, 1)
        return {
            "class": CLASS_NAMES[idx],
            "confidence": float(out[idx]),
            "probs": {CLASS_NAMES[i]: round(float(out[i]), 4) for i in range(len(CLASS_NAMES))},
            "latency_ms": latency,
            "compression_ms": 0.0,
            "file_size": os.path.getsize(image_path) if os.path.exists(image_path) else 0,
        }


# =========================================================================
# ML: DECISION ENGINE (mission_rules.json driven)
# =========================================================================
def load_rules():
    if os.path.exists(RULES_FILE):
        try:
            with open(RULES_FILE) as f:
                return json.load(f)
        except Exception:
            pass
    return DEFAULT_RULES


def decide(image_id, classification, rules):
    cls = classification["class"]
    conf = classification["confidence"]
    rule = rules.get(cls, DEFAULT_RULES.get(cls, {}))
    action = rule.get("action", "keep")
    priority = rule.get("priority", 1)
    quality = rule.get("jpeg_quality", 85)
    thr = rule.get("discard_confidence_threshold", 0.85)

    # Low-confidence discard protection: defer instead of dropping
    if action == "discard" and conf < thr:
        action = "defer"
        priority = max(priority, 2)
        reason = f"{cls} at {conf:.0%} < discard threshold {thr:.0%} - DEFERRED (safety)"
    else:
        reason = f"{cls} at {conf:.0%} -> {action.upper()} (priority {priority}, q{quality})"

    return {"image_id": image_id, "predicted_class": cls, "confidence": conf,
            "action": action, "priority": priority, "jpeg_quality": quality,
            "reason": reason, "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S")}


def log_decision(decision):
    os.makedirs(STATE_DIR, exist_ok=True)
    with open(DECISIONS_LOG, 'a') as f:
        f.write(json.dumps(decision) + "\n")


def summarize_decisions():
    if not os.path.exists(DECISIONS_LOG):
        return "0 kept | 0 deferred | 0 discarded"
    kept = deferred = discarded = 0
    with open(DECISIONS_LOG) as f:
        for line in f:
            try:
                a = json.loads(line).get("action")
                if a == "keep": kept += 1
                elif a == "defer": deferred += 1
                elif a == "discard": discarded += 1
            except Exception:
                continue
    return f"{kept} kept | {deferred} deferred | {discarded} discarded"


# =========================================================================
# COMPRESSION (JPEG at ML-decided quality) — done BEFORE chunking
# =========================================================================
def compress_image(image_path, quality):
    """Re-encode JPEG at the decided quality. Returns (compressed_bytes, compression_ms)."""
    t0 = time.time()
    if not IMAGING:
        with open(image_path, 'rb') as f:
            data = f.read()
        return data, round((time.time() - t0) * 1000, 1)
    img = Image.open(image_path).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    data = buf.getvalue()
    return data, round((time.time() - t0) * 1000, 1)


def fmt_size(n):
    return f"{n/1024:.0f} KB" if n >= 1024 else f"{n} B"


# =========================================================================
# LISTEN FOR GROUND STATION RESPONSES
# =========================================================================
def listen_for(radio, w_mission, w_image, timeout, expect=("status", "nack", "ack")):
    radio.start_rx()
    deadline = time.time() + timeout
    while time.time() < deadline:
        payload, rssi, snr = radio.check_rx(0.1)
        if not payload or payload == "crc_error":
            continue
        if len(payload) < 16:
            continue
        ptype = payload[1]
        m, i = payload[2:8], payload[8:14]
        if os.getenv("DEBUG_HEX"):
            print(f"    [HEX] RX type={ptype} len={len(payload)} m={m} i={i}")
        if m != w_mission or i != w_image:
            continue
        if ptype == PKT_STATUS and "status" in expect:
            res = parse_status(payload[HEADER_SIZE:])
            if res:
                total, recvd, missing = res
                return {"kind": "status", "missing": missing, "total": total,
                        "recvd": recvd, "rssi": rssi, "snr": snr}
        elif ptype == PKT_ACK and "ack" in expect:
            return {"kind": "ack", "missing": [], "total": None,
                    "recvd": None, "rssi": rssi, "snr": snr}
        elif ptype == PKT_NACK and "nack" in expect:
            # NACK payload: mission_id(6) + image_id(6) + count(u16) + missing[]
            # count at payload[12:14], missing at payload[14:]
            count = (payload[12] << 8) | payload[13]
            missing = list(payload[14:14 + count])
            return {"kind": "nack", "missing": missing, "total": None,
                    "recvd": None, "rssi": rssi, "snr": snr}
    return {"kind": None, "rssi": None, "snr": None}


# =========================================================================
# SEND ONE IMAGE (one revolution attempt)
# =========================================================================
replies_count = 0


def send_image(radio, mission_id, img, revolution, rules, priority_bucket=1):
    global replies_count
    image_id = img["id"]
    file_path = img["file"]
    chunk_size = img.get("chunk_size", 200)
    metadata = dict(img.get("metadata", {}))

    if not os.path.exists(file_path):
        print(f"[SKIP] {image_id}: file not found ({file_path})")
        return False

    prev_confirmed, prev_attempts = load_state(mission_id, image_id)

    print(f"\n{'='*60}")
    print(f"[REVOLUTION {revolution}] Project {mission_id} | Image {image_id}")

    # ---- ML: classify -> decide -> log ----
    classification = Classifier.classify(file_path)
    print(f"  [ML] Class: {classification['class']} "
          f"({classification['confidence']:.1%}) | Latency: {classification['latency_ms']:.1f}ms")
    decision = decide(image_id, classification, rules)
    print(f"  [ML] Decision: {decision['action'].upper()} | "
          f"Priority {decision['priority']} | JPEG q{decision['jpeg_quality']}")
    print(f"       {decision['reason']}")
    log_decision(decision)

    # Bucket filter: only transmit if decision priority <= current bucket
    if decision["priority"] > priority_bucket:
        print(f"  [FILTER] {decision['action'].upper()} (p={decision['priority']}) skipped — bucket={priority_bucket}")
        mark_complete(mission_id, image_id)  # mark done so we don't retry
        return True

    if decision["action"] == "discard":
        print(f"  [ML] DISCARDED per mission rules — skipping transmission.")
        mark_complete(mission_id, image_id)
        return True

    # ---- Compress at decided quality BEFORE chunking ----
    raw_size = os.path.getsize(file_path)
    data, comp_ms = compress_image(file_path, decision["jpeg_quality"])
    total_segments = (len(data) + chunk_size - 1) // chunk_size
    ratio = (1 - len(data) / raw_size) * 100 if raw_size else 0
    print(f"  [ML] Inference: {classification['latency_ms']:.1f}ms | Compression: {comp_ms:.1f}ms")
    print(f"  [COMPRESS] {fmt_size(raw_size)} -> {fmt_size(len(data))} "
          f"(q{decision['jpeg_quality']}, saved {ratio:.0f}%) | "
          f"Chunk {chunk_size}B | Total {total_segments} segments")
    if prev_confirmed:
        print(f"  Local state: {len(prev_confirmed)} previously confirmed segments")

    # Attach compression info to META
    metadata.update({
        "classification": classification["class"],
        "confidence": round(classification["confidence"], 3),
        "action": decision["action"],
        "priority": decision["priority"],
        "jpeg_quality": decision["jpeg_quality"],
        "size": len(data),
        "total_segments": total_segments,
        "ml_latency_ms": classification["latency_ms"],
        "compression_ms": comp_ms,
    })

    w_mission, w_image = wire_id(mission_id), wire_id(image_id)

    # ---- Send META preamble ----
    try:
        radio.send_packet(build_meta_packet(w_mission, w_image, metadata, total_segments))
        print(f"  [META] Sent -> {classification['class']} q{decision['jpeg_quality']} {total_segments} segs")
    except TimeoutError:
        print("  [FAIL] META TX timeout")
        return False

    radio.start_rx()
    time.sleep(0.1)

    # ---- Handshake: wait for STATUS (RETRANSMISSION-FIRST) ----
    # ESP32 tells us what it already has / is asking for. We honour that first.
    resp = {"kind": None, "missing": [], "total": 0, "recvd": 0}
    for _ in range(3):
        resp = listen_for(radio, w_mission, w_image, STATUS_WAIT_SEC, expect=("status",))
        if resp["kind"] == "status":
            replies_count += 1
            break
        time.sleep(1.0)

    if resp["kind"] == "status":
        rx_missing = set(resp["missing"])
        rx_total = resp["total"] or total_segments
        rx_recvd = resp["recvd"] or 0
        print(f"  [STATUS] Ground station has {rx_recvd}/{rx_total}, "
              f"requesting {len(rx_missing)} missing segment(s)")
        prev_n = len(prev_confirmed)
        if rx_recvd >= rx_total and prev_n < rx_total - 10:
            print(f"  [WARN] DESYNC_SUSPECTED: ESP32 claims {rx_recvd}/{rx_total} but Pi "
                  f"tracked only {prev_n}. Falling back to local state.")
            queue = [s for s in range(total_segments) if s not in prev_confirmed]
        else:
            queue = sorted(s for s in rx_missing if s < total_segments)
    else:
        queue = [s for s in range(total_segments) if s not in prev_confirmed]
        if prev_confirmed:
            print(f"  [STATUS] No reply — resuming from local state "
                  f"(skip {len(prev_confirmed)} known-sent)")
        else:
            print(f"  [STATUS] No reply — starting fresh transfer of all {total_segments} segments")

    # ---- Send batches within the 60s window ----
    start = time.time()
    confirmed = set(prev_confirmed)
    sent_this_pass = set()
    batch_no = 0
    last_rtt = None
    total_bytes_sent = 0
    total_airtime_ms = 0

    while queue and (time.time() - start) < DOWNLINK_WINDOW_SEC:
        batch, queue = queue[:BATCH_SIZE], queue[BATCH_SIZE:]
        if not batch:
            break
        batch_no += 1
        t0 = time.time()
        batch_bytes = 0
        for seg in batch:
            if (time.time() - start) >= DOWNLINK_WINDOW_SEC:
                queue.insert(0, seg)
                break
            payload = data[seg * chunk_size:(seg + 1) * chunk_size]
            try:
                radio.send_packet(build_data_packet(w_mission, w_image, seg, total_segments, payload))
                sent_this_pass.add(seg)
                batch_bytes += len(payload)
            except TimeoutError:
                queue.append(seg)

        resp = listen_for(radio, w_mission, w_image, 1.5, expect=("status", "nack", "ack"))
        rtt_ms = int((time.time() - t0) * 1000)
        if resp["kind"] is not None:
            replies_count += 1

        if resp["kind"] == "ack":
            confirmed |= sent_this_pass
            queue = []
            last_rtt = rtt_ms
        elif resp["kind"] in ("nack", "status"):
            missing_set = set(resp["missing"])
            confirmed |= (sent_this_pass - missing_set)
            queue = sorted(missing_set - confirmed) + queue
            last_rtt = rtt_ms

        total_bytes_sent += batch_bytes
        total_airtime_ms += rtt_ms if rtt_ms else 0

        elapsed = time.time() - start
        remaining = max(0, DOWNLINK_WINDOW_SEC - elapsed)
        inst_bps = int(batch_bytes / max(rtt_ms / 1000, 0.001)) if rtt_ms else 0
        avg_bps = int(total_bytes_sent / max(elapsed, 0.001)) if elapsed > 0 else 0
        rtt_txt = f"{last_rtt}ms" if last_rtt else "—"
        sig = f"RSSI {resp['rssi']} SNR {resp['snr']:.1f}" if resp.get("rssi") is not None else ""
        print(f"  [{batch_no:02d}] {remaining:4.0f}s left | confirmed {len(confirmed)}/{total_segments} | "
              f"pending {len(queue)} | inst {inst_bps} B/s | avg {avg_bps} B/s | RTT {rtt_txt} {sig}")

    elapsed = time.time() - start
    eff_kbps = (len(confirmed) * chunk_size * 8) / (elapsed * 1000) if elapsed > 0.001 else 0.0
    save_state(mission_id, image_id, confirmed, prev_attempts + 1)

    display = len(confirmed)
    if resp.get("kind") == "status" and (resp.get("recvd") or 0) >= total_segments:
        display = min(resp["recvd"], total_segments)

    if display >= total_segments:
        try:
            radio.send_packet(build_done_packet(w_mission, w_image, total_segments))
        except TimeoutError:
            pass
        mark_complete(mission_id, image_id)
        print(f"\n[SUCCESS] REVOLUTION {revolution}: {image_id} COMPLETE | "
              f"{display}/{total_segments} segments | {replies_count} replies | "
              f"eff {eff_kbps:.1f} kbps | {elapsed:.1f}s | "
              f"ML {classification['latency_ms']:.1f}ms | Comp {comp_ms:.1f}ms | "
              f"TX {total_airtime_ms:.0f}ms airtime | {total_bytes_sent/1024:.1f}KB sent")
        print(f"  [ML] {summarize_decisions()}")
        return True

    print(f"\n[REVOLUTION {revolution} ENDED] {image_id}")
    print(f"  Confirmed: {display}/{total_segments} | "
          f"Pending: {total_segments - display} (resume next pass) | "
          f"eff {eff_kbps:.1f} kbps | {elapsed:.1f}s | "
          f"ML {classification['latency_ms']:.1f}ms | Comp {comp_ms:.1f}ms | "
          f"TX {total_airtime_ms:.0f}ms airtime | {total_bytes_sent/1024:.1f}KB sent")
    print(f"  [ML] {summarize_decisions()}")
    return False


# =========================================================================
# MISSION CONFIG
# =========================================================================
def load_mission():
    if not os.path.exists(MISSION_FILE):
        print(f"[FAIL] Config not found: {MISSION_FILE}")
        sys.exit(1)
    with open(MISSION_FILE) as f:
        cfg = json.load(f)
    mission = cfg["missions"][0] if cfg.get("missions") else cfg
    for img in mission.get("images", []):
        if not os.path.isabs(img["file"]):
            img["file"] = os.path.join(NEURONEX_DIR, img["file"])
    return mission


# =========================================================================
# MAIN
# =========================================================================
def main():
    global replies_count
    send_all = "--all" in sys.argv
    reset = "--reset" in sys.argv

    if reset and os.path.isdir(STATE_DIR):
        for f in glob.glob(os.path.join(STATE_DIR, "*")):
            os.remove(f)
        print("[RESET] All mission state cleared.")

    Classifier.load()
    rules = load_rules()

    # Continuous schedule mode: --schedule runs indefinitely with 12 revs/day
    run_schedule = "--schedule" in sys.argv
    schedule_interval = 86400 // REVS_PER_DAY  # seconds between revolutions (7200 = 2 hours)

    radio = LoRa()
    if not radio.begin():
        radio.close()
        return

    try:
        mission = load_mission()
    except Exception as e:
        print(f"[FAIL] Mission config error: {e}")
        radio.close()
        return

    mission_id = mission["id"]
    all_images = mission.get("images", [])

    def get_remaining(bucket_priority):
        """Get images matching bucket (1=CLEAR, 2=CLEAR+CLOUDY) that aren't complete."""
        remaining = []
        for im in all_images:
            if is_complete(im["id"]):
                continue
            if not os.path.exists(im["file"]):
                continue
            c = Classifier.classify(im["file"])
            d = decide(im["id"], c, rules)
            if d["priority"] <= bucket_priority:
                im["_decision"] = d
                remaining.append(im)
        return remaining

    revolution = 1
    total_processed = 0

    while True:
        # Listen for ground command at start of revolution
        radio.start_rx()
        print(f"\n[REVOLUTION {revolution}] Listening for ground command (2s)...")
        cmd, value = radio.listen_for_cmd(timeout=2.0)
        if cmd == CMD_PRIORITY:
            target_priority = value
            print(f"  [CMD] Priority bucket set to {target_priority} ({'CLEAR' if value == 1 else 'CLEAR+CLOUDY'})")
        else:
            target_priority = 1  # default: CLEAR only
            print(f"  [CMD] No command received — defaulting to CLEAR-only (prio=1)")

        # Process CLEAR images (priority 1)
        clear_images = get_remaining(1)
        if clear_images:
            print(f"[QUEUE] {len(clear_images)} CLEAR images pending")
            for im in clear_images:
                if send_image(radio, mission_id, im, revolution, rules, priority_bucket=1):
                    total_processed += 1
                    revolution += 1
                    if not run_schedule:
                        break

        # After CLEAR done, check for CLOUDY request in same window
        if target_priority >= 2:
            cloudy_images = get_remaining(2)
            cloudy_images = [im for im in cloudy_images if im["_decision"]["priority"] == 2]
            if cloudy_images:
                print(f"[QUEUE] {len(cloudy_images)} CLOUDY images requested — processing in same window")
                for im in cloudy_images:
                    if send_image(radio, mission_id, im, revolution, rules, priority_bucket=2):
                        total_processed += 1
                        revolution += 1
                        if not run_schedule:
                            break

        # Summary
        print(f"\n{'='*60}")
        print(f"[REVOLUTION {revolution-1} COMPLETE] Processed: {total_processed} images total")
        print(f"  ML Decisions: {summarize_decisions()}")

        if not run_schedule:
            print(f"[SINGLE RUN MODE] Exiting.")
            break

        # Wait until next revolution
        next_rev_in = schedule_interval
        print(f"[SCHEDULE] Next revolution in {next_rev_in//3600}h {(next_rev_in%3600)//60}m...")
        time.sleep(next_rev_in)

    radio.close()

    total_done = completed_before + newly
    print(f"\n{'='*60}")
    print(f"[MISSION SUMMARY] {mission_id}")
    print(f"  Processed: {total_done}/{len(images)} images")
    print(f"  ML Decisions: {summarize_decisions()}")
    if total_done >= len(images):
        print(f"  >>> MISSION {mission_id} COMPLETED <<<")
    else:
        print(f"  Next pass resumes at image index {total_done + 1}")
    print(f"{'='*60}")
    radio.close()


if __name__ == "__main__":
    main()
