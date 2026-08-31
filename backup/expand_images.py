#!/usr/bin/env python3
"""
Expand Pi mission image dataset for longer trials.
Creates additional test images and updates mission_config.json.
Run on Pi: python3 expand_images.py
"""
import os
import json
import shutil
from PIL import Image, ImageDraw, ImageFont
import random

# Paths
NEURONEX_DIR = os.path.expanduser("~/neuronex")
MISSION_FILE = os.path.join(NEURONEX_DIR, "config", "mission_config.json")
MISSIONS_DIR = os.path.join(NEURONEX_DIR, "missions")
SOURCE_IMAGES = [
    os.path.join(MISSIONS_DIR, "NEX-000001_IMG-000001.jpg"),
    os.path.join(MISSIONS_DIR, "NEX-000001_IMG-000002.jpg"),
    os.path.join(MISSIONS_DIR, "NEX-000001_IMG-000003.jpg"),
    os.path.join(MISSIONS_DIR, "NEX-000001_IMG-000004.jpg"),
    os.path.join(MISSIONS_DIR, "NEX-000001_IMG-000005.jpg"),
    os.path.join(MISSIONS_DIR, "NEX-000001_IMG-000006.jpg"),
]

# Target: 30 total images (6 existing + 24 new) = enough for ~2-3 days at 12 revs/day
TARGET_TOTAL = 30

# Labels for new images
LOCATIONS = [
    ("78.5", "-45.2"), ("78.3", "-44.8"), ("78.1", "-44.5"),
    ("77.9", "-44.1"), ("77.7", "-43.8"), ("77.5", "-43.4"),
    ("77.3", "-43.0"), ("77.1", "-42.6"), ("76.9", "-42.2"),
    ("76.7", "-41.8"), ("76.5", "-41.4"), ("76.3", "-41.0"),
    ("76.1", "-40.6"), ("75.9", "-40.2"), ("75.7", "-39.8"),
    ("75.5", "-39.4"), ("75.3", "-39.0"), ("75.1", "-38.6"),
    ("74.9", "-38.2"), ("74.7", "-37.8"), ("74.5", "-37.4"),
    ("74.3", "-37.0"), ("74.1", "-36.6"), ("73.9", "-36.2"),
]

SENSORS = ["EO-Vis", "EO-IR", "SAR", "EO-Multispectral"]
TARGETS = [
    "Ice Shelf Monitoring", "Thermal Anomaly Detection", "Surface Deformation",
    "Coastal Mapping", "Vegetation Index", "Vessel Detection",
    "Cloud Cover Assessment", "Heat Signature", "Subsurface Imaging",
    "Mission End Marker", "Glacier Calving", "Sea Ice Extent",
    "Ocean Color", "Atmospheric Profile", "Land Surface Temperature",
    "Snow Cover Mapping", "Flood Extent", "Urban Heat Island",
    "Forest Health", "Crop Monitoring", "Oil Spill Detection",
    "Algal Bloom", "Volcanic Ash"
]
CLASSIFICATIONS = ["UNCLASSIFIED", "RESTRICTED", "CONFIDENTIAL"]

def create_synthetic_image(output_path, img_num, lat, lon, sensor, target, classification):
    """Create a synthetic satellite-like image with metadata text overlay."""
    # 384x384 RGB
    img = Image.new('RGB', (384, 384), color=(20, 30, 50))
    draw = ImageDraw.Draw(img)

    # Add some "terrain" patterns
    for y in range(0, 384, 8):
        for x in range(0, 384, 8):
            # Simulate terrain variation
            val = (x * 7 + y * 13 + img_num * 97) % 80
            color = (val + 40, val + 20, val + 10)
            draw.rectangle([x, y, x+7, y+7], fill=color)

    # Add text overlay with mission info
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
    except:
        font = ImageFont.load_default()

    lines = [
        f"IMG-{img_num:06d}",
        f"Lat: {lat}  Lon: {lon}",
        f"Sensor: {sensor}",
        f"Target: {target}",
        f"Class: {classification}",
    ]

    y_pos = 10
    for line in lines:
        draw.text((10, y_pos), line, fill=(255, 255, 255), font=font)
        y_pos += 14

    # Add a "cloud" pattern for some images (simulate cloudy)
    if "CLOUD" in target.upper() or random.random() < 0.3:
        for _ in range(20):
            cx = random.randint(50, 334)
            cy = random.randint(50, 334)
            r = random.randint(10, 40)
            draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(180, 180, 200, 128))

    img.save(output_path, "JPEG", quality=85)
    return os.path.getsize(output_path)

def main():
    os.makedirs(MISSIONS_DIR, exist_ok=True)

    # Load existing mission config
    with open(MISSION_FILE) as f:
        config = json.load(f)

    mission = config["missions"][0]
    existing_images = mission["images"]
    existing_count = len(existing_images)

    print(f"Found {existing_count} existing images")
    print(f"Target: {TARGET_TOTAL} total images")

    # Create new images
    new_images = []
    for i in range(existing_count + 1, TARGET_TOTAL + 1):
        img_id = f"IMG-{i:06d}"
        filename = f"NEX-000001_{img_id}.jpg"
        filepath = os.path.join(MISSIONS_DIR, filename)

        lat, lon = LOCATIONS[(i - 1) % len(LOCATIONS)]
        sensor = SENSORS[(i - 1) % len(SENSORS)]
        target = TARGETS[(i - 1) % len(TARGETS)]
        classification = CLASSIFICATIONS[(i - 1) % len(CLASSIFICATIONS)]

        size = create_synthetic_image(filepath, i, lat, lon, sensor, target, classification)

        new_img = {
            "id": img_id,
            "file": f"missions/{filename}",
            "chunk_size": 200,
            "metadata": {
                "capture_time": f"2026-08-20T06:{(i*3)%60:02d}:{(i*7)%60:02d}Z",
                "latitude": float(lat),
                "longitude": float(lon),
                "altitude_km": 520,
                "classification": classification,
                "sensor": sensor,
                "resolution_m": 1.5 + (i % 3) * 0.5,
                "target": target
            }
        }
        new_images.append(new_img)
        print(f"  Created: {filename} ({size} bytes) - {target}")

    # Combine existing + new
    mission["images"] = existing_images + new_images

    # Save updated config
    with open(MISSION_FILE, 'w') as f:
        json.dump(config, f, indent=2)

    print(f"\nDone! Total images: {len(mission['images'])}")
    print(f"Mission config updated: {MISSION_FILE}")

if __name__ == "__main__":
    main()