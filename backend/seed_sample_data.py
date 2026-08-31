from datetime import datetime, timedelta
from app import app, db
from models import Image, Telemetry, Revolution, Retransmission, ImageStatus, Classification, Action

def seed():
    with app.app_context():
        # Clear existing
        db.session.query(Telemetry).delete()
        db.session.query(Retransmission).delete()
        db.session.query(Revolution).delete()
        db.session.query(Image).delete()
        db.session.commit()

        now = datetime.utcnow()

        images = [
            Image(
                id="IMG-000001",
                mission_id="NEX-000001",
                file_path="images/IMG-000001.jpg",
                classification=Classification.CLEAR.value,
                confidence=0.98,
                all_probabilities={"CLEAR": 0.98, "CLOUDY": 0.015, "NOT_VISIBLE": 0.005},
                latency_ms=32.4,
                classified_at=now - timedelta(minutes=15),
                action=Action.KEEP.value,
                priority=1,
                jpeg_quality=85,
                status=ImageStatus.TRANSMITTING.value,
                total_segments=16,
                segments_confirmed=11,
                current_segment=11,
                chunk_size=200,
                rssi=-72,
                snr=9.4,
                throughput_bps=1450.0,
                latency_ms_tx=42.1,
                progress_percent=68.8,
                created_at=now - timedelta(minutes=20),
                updated_at=now - timedelta(seconds=10),
            ),
            Image(
                id="IMG-000002",
                mission_id="NEX-000001",
                file_path="images/IMG-000002.jpg",
                classification=Classification.CLEAR.value,
                confidence=0.94,
                all_probabilities={"CLEAR": 0.94, "CLOUDY": 0.05, "NOT_VISIBLE": 0.01},
                latency_ms=28.1,
                classified_at=now - timedelta(minutes=10),
                action=Action.KEEP.value,
                priority=2,
                jpeg_quality=85,
                status=ImageStatus.QUEUED.value,
                total_segments=14,
                segments_confirmed=0,
                current_segment=0,
                chunk_size=200,
                rssi=-75,
                snr=8.0,
                throughput_bps=1200.0,
                progress_percent=0.0,
                created_at=now - timedelta(minutes=12),
                updated_at=now - timedelta(minutes=5),
            ),
            Image(
                id="IMG-000003",
                mission_id="NEX-000001",
                file_path="images/IMG-000003.jpg",
                classification=Classification.CLOUDY.value,
                confidence=0.88,
                all_probabilities={"CLEAR": 0.08, "CLOUDY": 0.88, "NOT_VISIBLE": 0.04},
                latency_ms=30.0,
                classified_at=now - timedelta(minutes=8),
                action=Action.DEFER.value,
                priority=3,
                jpeg_quality=65,
                status=ImageStatus.QUEUED.value,
                total_segments=12,
                segments_confirmed=0,
                current_segment=0,
                chunk_size=200,
                progress_percent=0.0,
                created_at=now - timedelta(minutes=8),
                updated_at=now - timedelta(minutes=3),
            ),
            Image(
                id="IMG-000004",
                mission_id="NEX-000001",
                file_path="images/IMG-000004.jpg",
                classification=Classification.CLEAR.value,
                confidence=0.99,
                all_probabilities={"CLEAR": 0.99, "CLOUDY": 0.008, "NOT_VISIBLE": 0.002},
                latency_ms=31.2,
                classified_at=now - timedelta(hours=1),
                action=Action.KEEP.value,
                priority=1,
                jpeg_quality=85,
                status=ImageStatus.COMPLETE.value,
                total_segments=20,
                segments_confirmed=20,
                current_segment=20,
                chunk_size=200,
                rssi=-68,
                snr=11.2,
                throughput_bps=1520.0,
                latency_ms_tx=38.5,
                progress_percent=100.0,
                created_at=now - timedelta(hours=1, minutes=10),
                updated_at=now - timedelta(hours=1),
                transmitted_at=now - timedelta(hours=1),
                completed_at=now - timedelta(hours=1)
            ),
            Image(
                id="IMG-000005",
                mission_id="NEX-000001",
                file_path="images/IMG-000005.jpg",
                classification=Classification.NOT_VISIBLE.value,
                confidence=0.92,
                all_probabilities={"CLEAR": 0.03, "CLOUDY": 0.05, "NOT_VISIBLE": 0.92},
                latency_ms=29.5,
                classified_at=now - timedelta(minutes=5),
                action=Action.DISCARD.value,
                priority=99,
                jpeg_quality=40,
                status=ImageStatus.DISCARDED.value,
                total_segments=10,
                segments_confirmed=0,
                current_segment=0,
                progress_percent=0.0,
                created_at=now - timedelta(minutes=5),
                updated_at=now - timedelta(minutes=5),
            )
        ]
        db.session.add_all(images)

        # Telemetry records
        telem_records = []
        for i in range(1, 12):
            telem_records.append(
                Telemetry(
                    image_id="IMG-000001",
                    mission_id="NEX-000001",
                    packet_type="DATA",
                    segment_num=i,
                    total_segments=16,
                    rssi=-75 + (i % 5),
                    snr=8.0 + (i % 3) * 0.5,
                    latency_ms=40.0 + (i % 4),
                    timestamp=now - timedelta(seconds=(12 - i) * 5)
                )
            )
        db.session.add_all(telem_records)

        # Retransmission
        retrans = Retransmission(
            image_id="IMG-000001",
            mission_id="NEX-000001",
            missing_segments=[5, 8],
            requested_at=now - timedelta(minutes=2),
            status="pending"
        )
        db.session.add(retrans)

        # Revolutions
        rev1 = Revolution(
            revolution_num=1,
            mission_id="NEX-000001",
            window_start=now - timedelta(minutes=2),
            window_end=now + timedelta(minutes=3),
            window_duration_sec=300,
            images_planned=[{"id": "IMG-000001", "priority": 1}, {"id": "IMG-000002", "priority": 2}],
            images_completed=["IMG-000004"],
            images_failed=[],
            status="active",
            total_segments_planned=30,
            total_segments_transmitted=11,
            total_segments_confirmed=11,
            started_at=now - timedelta(minutes=2)
        )
        rev2 = Revolution(
            revolution_num=2,
            mission_id="NEX-000001",
            window_start=now + timedelta(hours=2),
            window_end=now + timedelta(hours=2, minutes=3),
            window_duration_sec=180,
            images_planned=[{"id": "IMG-000003", "priority": 3}],
            images_completed=[],
            images_failed=[],
            status="scheduled",
            total_segments_planned=12,
            total_segments_transmitted=0,
            total_segments_confirmed=0
        )
        db.session.add_all([rev1, rev2])

        db.session.commit()
        print("Database successfully seeded with realistic sample data!")

if __name__ == "__main__":
    seed()
