import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    # Serial (ESP32 bridge)
    SERIAL_PORT: str = os.getenv("SERIAL_PORT", "/dev/ttyUSB0")
    SERIAL_BAUDRATE: int = int(os.getenv("SERIAL_BAUDRATE", "115200"))
    SERIAL_TIMEOUT: float = 1.0

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///neuronex.db")

    # Flask
    FLASK_ENV: str = os.getenv("FLASK_ENV", "development")
    FLASK_DEBUG: bool = os.getenv("FLASK_DEBUG", "1") == "1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-in-production")

    # Revolution schedule
    REVOLUTION_WINDOW_SEC: int = 60
    REVOLUTIONS_PER_DAY: int = 3

    # LoRa protocol
    PROTOCOL_VERSION: int = 1
    PKT_DATA: int = 0
    PKT_ACK: int = 1
    PKT_NACK: int = 2
    PKT_META: int = 3
    PKT_STATUS: int = 4
    PKT_DONE: int = 5
    PKT_TELEMETRY: int = 6  # ESP32 -> Laptop: RSSI/SNR

    # Serial frame
    FRAME_START: int = 0xAA
    MAX_PAYLOAD: int = 255


config = Config()