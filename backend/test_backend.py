import unittest
import json
from datetime import datetime, timedelta
from app import create_app
from models import db, Image, Telemetry, Retransmission, Revolution, ImageStatus, Classification, Action
from services.protocol import build_cmd_packet, CMD_PRIORITY

class NeuronexBackendTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app, cls.socketio = create_app()
        cls.app.config["TESTING"] = True
        cls.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            db.drop_all()
            db.create_all()

    def setUp(self):
        with self.app.app_context():
            db.session.query(Telemetry).delete()
            db.session.query(Retransmission).delete()
            db.session.query(Revolution).delete()
            db.session.query(Image).delete()
            db.session.commit()

            # Seed test image
            img1 = Image(
                id="IMG-000001",
                mission_id="NEX-000001",
                file_path="images/IMG-000001.jpg",
                classification=Classification.CLEAR.value,
                confidence=0.98,
                action=Action.KEEP.value,
                priority=1,
                status=ImageStatus.QUEUED.value,
                total_segments=10,
                segments_confirmed=2,
                current_segment=2,
                progress_percent=20.0,
                rssi=-75,
                snr=8.5,
                throughput_bps=1200.0,
                latency_ms_tx=45.0
            )
            img2 = Image(
                id="IMG-000002",
                mission_id="NEX-000001",
                file_path="images/IMG-000002.jpg",
                classification=Classification.CLOUDY.value,
                confidence=0.85,
                action=Action.DEFER.value,
                priority=2,
                status=ImageStatus.PENDING.value,
                total_segments=12,
                segments_confirmed=0,
                current_segment=0,
                progress_percent=0.0
            )
            db.session.add_all([img1, img2])
            db.session.commit()

            # Seed telemetry
            t1 = Telemetry(
                image_id="IMG-000001",
                mission_id="NEX-000001",
                packet_type="DATA",
                segment_num=1,
                total_segments=10,
                rssi=-76,
                snr=8.2,
                latency_ms=44.0
            )
            db.session.add(t1)
            db.session.commit()

    # 1. Health endpoint
    def test_health_endpoint(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("status"), "healthy")
        self.assertEqual(data.get("version"), "1.0.0")

    # 2. Images endpoints
    def test_images_list(self):
        res = self.client.get("/api/images")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("total"), 2)
        self.assertEqual(len(data.get("images")), 2)

    def test_images_stats(self):
        res = self.client.get("/api/images/stats")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("total"), 2)
        self.assertIn("by_status", data)
        self.assertIn("by_classification", data)
        self.assertIn("by_action", data)
        self.assertIn("completion_rate", data)

    def test_image_detail(self):
        res = self.client.get("/api/images/IMG-000001")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("id"), "IMG-000001")
        self.assertEqual(data.get("classification"), "CLEAR")

    def test_image_progress(self):
        res = self.client.get("/api/images/IMG-000001/progress")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("image_id"), "IMG-000001")
        self.assertEqual(data.get("progress_percent"), 20.0)

    # 3. Telemetry endpoints
    def test_telemetry_latest(self):
        res = self.client.get("/api/telemetry")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIsNotNone(data.get("latest_overall"))
        self.assertEqual(data["latest_overall"]["image_id"], "IMG-000001")

    def test_telemetry_history(self):
        res = self.client.get("/api/telemetry/history")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("count"), 1)
        self.assertIn("by_type", data)

    def test_telemetry_signal(self):
        res = self.client.get("/api/telemetry/signal")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("count"), 1)
        self.assertIn("rssi", data.get("stats", {}))

    # 4. Queue endpoints
    def test_queue_get_and_next(self):
        res = self.client.get("/api/queue")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("count"), 1)

        res_next = self.client.get("/api/queue/next")
        self.assertEqual(res_next.status_code, 200)
        data_next = res_next.get_json()
        self.assertIsNotNone(data_next.get("next"))
        self.assertEqual(data_next["next"]["id"], "IMG-000001")

    def test_queue_reorder(self):
        payload = [{"id": "IMG-000001", "priority": 5}]
        res = self.client.post("/api/queue/reorder", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("count"), 1)

    # 5. Retransmission endpoints
    def test_retransmission_flow(self):
        with self.app.app_context():
            retrans = Retransmission(
                image_id="IMG-000001",
                mission_id="NEX-000001",
                missing_segments=[3, 4, 7],
                status="pending"
            )
            db.session.add(retrans)
            db.session.commit()
            r_id = retrans.id

        # List
        res = self.client.get("/api/retransmissions")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json().get("count"), 1)

        # Get
        res = self.client.get(f"/api/retransmissions/{r_id}")
        self.assertEqual(res.status_code, 200)

        # Ack
        res = self.client.post("/api/retransmissions/ack", json={"retransmit_id": r_id})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["retransmission"]["status"], "acknowledged")

        # Complete
        res = self.client.post(f"/api/retransmissions/{r_id}/complete")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["retransmission"]["status"], "completed")

        # Stats
        res = self.client.get("/api/retransmissions/stats")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json().get("completed"), 1)

    # 6. Revolutions endpoints
    def test_revolution_flow(self):
        # Schedule
        now_iso = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
        plan_payload = {
            "mission_id": "NEX-000001",
            "revolution_num": 1,
            "window_start": now_iso,
            "images_planned": [{"id": "IMG-000001", "priority": 1}]
        }
        res = self.client.post("/api/revolutions/schedule", json=plan_payload)
        self.assertEqual(res.status_code, 201)

        # List
        res = self.client.get("/api/revolutions")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json().get("count"), 1)

        # Start
        res = self.client.post("/api/revolutions/1/start")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["revolution"]["status"], "active")

        # Status
        res = self.client.get("/api/revolutions/status")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.get_json()["active"])

        # Complete
        complete_payload = {
            "images_completed": ["IMG-000001"],
            "images_failed": [],
            "total_segments_transmitted": 10,
            "total_segments_confirmed": 10
        }
        res = self.client.post("/api/revolutions/1/complete", json=complete_payload)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["revolution"]["status"], "completed")

        # Stats
        res = self.client.get("/api/revolutions/stats")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["completed"], 1)

    # 7. Command endpoints
    def test_command_endpoints(self):
        res = self.client.post("/api/command/priority", json={"priority": 1})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["status"], "queued")

        res = self.client.post("/api/command/reset")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["status"], "queued")

        res = self.client.post("/api/command/status")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["status"], "queued")

        res = self.client.get("/api/command/queue")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.get_json()["queued"], 3)

    # 8. Schedule endpoints
    def test_schedule_endpoints(self):
        res = self.client.get("/api/schedule/state")
        self.assertEqual(res.status_code, 200)
        self.assertIn("current_revolution", res.get_json())

        res = self.client.get("/api/schedule/next-revolution")
        self.assertEqual(res.status_code, 200)
        self.assertIn("next_rev_start_utc", res.get_json())

        res = self.client.get("/api/schedule/window")
        self.assertEqual(res.status_code, 200)
        self.assertIn("active", res.get_json())

        res = self.client.get("/api/schedule/config")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["revs_per_day"], 12)

    # 9. SocketIO integration test
    def test_socketio_events(self):
        sio_client = self.socketio.test_client(self.app)
        self.assertTrue(sio_client.is_connected())

        # Test ping/pong
        sio_client.emit("ping", {"timestamp": 123456789})
        received = sio_client.get_received()
        events = [r["name"] for r in received]
        self.assertIn("connected", events)
        self.assertIn("pong", events)

        # Test room subscriptions
        sio_client.emit("join:telemetry", {})
        sio_client.emit("join:queue", {})
        received2 = sio_client.get_received()
        events2 = [r["name"] for r in received2]
        self.assertIn("telemetry:subscribed", events2)
        self.assertIn("queue:subscribed", events2)

        sio_client.disconnect()

if __name__ == "__main__":
    unittest.main()
