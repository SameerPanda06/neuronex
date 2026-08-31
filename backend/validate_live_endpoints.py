import urllib.request
import urllib.parse
import json
import time

BASE_URL = "http://127.0.0.1:5000"

def get(path):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, headers={"User-Agent": "NeuronexTester/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status, json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')
    except Exception as e:
        return 0, str(e)

def post(path, payload):
    url = f"{BASE_URL}{path}"
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", "User-Agent": "NeuronexTester/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status, json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')
    except Exception as e:
        return 0, str(e)

results = []

def run_test(name, fn):
    try:
        status, data = fn()
        passed = (200 <= status < 300)
        results.append({"name": name, "status": status, "passed": passed, "data": data})
        print(f"[{'PASS' if passed else 'FAIL'}] {name} (HTTP {status})")
    except Exception as e:
        results.append({"name": name, "status": 0, "passed": False, "error": str(e)})
        print(f"[FAIL] {name}: {e}")

print("=== Starting Live HTTP Endpoint Tests ===")

# 1. Health
run_test("GET /api/health", lambda: get("/api/health"))

# 2. Images API
run_test("GET /api/images", lambda: get("/api/images"))
run_test("GET /api/images/stats", lambda: get("/api/images/stats"))
run_test("GET /api/images/storage/stats", lambda: get("/api/images/storage/stats"))
run_test("GET /api/images/storage/list", lambda: get("/api/images/storage/list"))

# 3. Telemetry API
run_test("GET /api/telemetry", lambda: get("/api/telemetry"))
run_test("GET /api/telemetry/history", lambda: get("/api/telemetry/history"))
run_test("GET /api/telemetry/signal", lambda: get("/api/telemetry/signal"))

# 4. Queue API
run_test("GET /api/queue", lambda: get("/api/queue"))
run_test("GET /api/queue/next", lambda: get("/api/queue/next"))
run_test("POST /api/queue/reorder", lambda: post("/api/queue/reorder", []))

# 5. Retransmission API
run_test("GET /api/retransmissions", lambda: get("/api/retransmissions"))
run_test("GET /api/retransmissions/stats", lambda: get("/api/retransmissions/stats"))

# 6. Revolutions API
run_test("GET /api/revolutions", lambda: get("/api/revolutions"))
run_test("GET /api/revolutions/current", lambda: get("/api/revolutions/current"))
run_test("GET /api/revolutions/status", lambda: get("/api/revolutions/status"))
run_test("GET /api/revolutions/stats", lambda: get("/api/revolutions/stats"))

# 7. Command API
run_test("POST /api/command/priority", lambda: post("/api/command/priority", {"priority": 1}))
run_test("POST /api/command/reset", lambda: post("/api/command/reset", {}))
run_test("POST /api/command/status", lambda: post("/api/command/status", {}))
run_test("GET /api/command/queue", lambda: get("/api/command/queue"))

# 8. Schedule API
run_test("GET /api/schedule/state", lambda: get("/api/schedule/state"))
run_test("GET /api/schedule/next-revolution", lambda: get("/api/schedule/next-revolution"))
run_test("GET /api/schedule/window", lambda: get("/api/schedule/window"))
run_test("GET /api/schedule/config", lambda: get("/api/schedule/config"))

total = len(results)
passed = sum(1 for r in results if r["passed"])
print(f"\n=== Test Summary: {passed}/{total} endpoints passed ===")

if passed != total:
    exit(1)
