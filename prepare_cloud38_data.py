#!/usr/bin/env python3
"""
Prepare cloud-38 dataset for DeepLabV3+ training.

Converts cloud-38 (1249 images) to train/val split with segmentation masks.
Since cloud-38 may only have image-level labels, this script creates
pseudo-masks using the existing TFLite model predictions as pseudo-labels,
or you can provide manual masks.

Usage:
  python prepare_cloud38_data.py --source /path/to/cloud-38 --output /path/to/prepared
"""

import os
import shutil
import numpy as np
import cv2
from pathlib import Path
from sklearn.model_selection import train_test_split
import argparse

# ============================================================
# CONFIG
# ============================================================
IMG_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.tif', '.tiff'}
TRAIN_RATIO = 0.8
SEED = 42

# ============================================================
# HELPERS
# ============================================================
def find_images(source_dir):
    """Find all images in source directory."""
    images = []
    for ext in IMG_EXTENSIONS:
        images.extend(Path(source_dir).rglob(f"*{ext}"))
    return sorted(images)

def create_pseudo_masks_with_model(image_paths, output_mask_dir, model_path, img_size=224):
    """Generate pseudo-masks using existing TFLite model."""
    import tensorflow as tf

    interpreter = tf.lite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    os.makedirs(output_mask_dir, exist_ok=True)

    for img_path in image_paths:
        # Load and preprocess
        img = cv2.imread(str(img_path))
        if img is None:
            continue
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img_resized = cv2.resize(img, (img_size, img_size))
        img_input = img_resized.astype(np.float32) / 255.0
        img_input = np.expand_dims(img_input, 0)

        # Handle quantized input
        if input_details[0]['dtype'] == np.uint8:
            scale, zero_point = input_details[0]['quantization']
            img_input = (img_input / scale + zero_point).astype(np.uint8)

        interpreter.set_tensor(input_details[0]['index'], img_input)
        interpreter.invoke()
        output = interpreter.get_tensor(output_details[0]['index'])[0]

        # Handle quantized output
        if output_details[0]['dtype'] == np.uint8:
            scale, zero_point = output_details[0]['quantization']
            output = (output.astype(np.float32) - zero_point) * scale

        # Get class mask (argmax)
        mask = np.argmax(output, axis=-1).astype(np.uint8)

        # Save mask
        mask_path = Path(output_mask_dir) / f"{img_path.stem}.png"
        cv2.imwrite(str(mask_path), mask)

    print(f"Generated {len(list(Path(output_mask_dir).glob('*.png')))} pseudo-masks")

def prepare_dataset(source_dir, output_dir, model_path=None):
    """Prepare dataset with train/val split."""

    # Find images
    images = find_images(source_dir)
    print(f"Found {len(images)} images in {source_dir}")

    if len(images) == 0:
        print("No images found!")
        return

    # Split
    train_imgs, val_imgs = train_test_split(images, train_size=TRAIN_RATIO, random_state=SEED)
    print(f"Train: {len(train_imgs)}, Val: {len(val_imgs)}")

    # Create output structure
    for split in ["train", "val"]:
        (Path(output_dir) / "images" / split).mkdir(parents=True, exist_ok=True)
        (Path(output_dir) / "masks" / split).mkdir(parents=True, exist_ok=True)

    # Copy images
    for img in train_imgs:
        dst = Path(output_dir) / "images" / "train" / img.name
        shutil.copy2(img, dst)
    for img in val_imgs:
        dst = Path(output_dir) / "images" / "val" / img.name
        shutil.copy2(img, dst)

    # Generate or copy masks
    if model_path:
        print("Generating pseudo-masks with model...")
        create_pseudo_masks_with_model(train_imgs, Path(output_dir) / "masks" / "train", model_path)
        create_pseudo_masks_with_model(val_imgs, Path(output_dir) / "masks" / "val", model_path)
    else:
        print("No model provided - you must provide manual masks in:")
        print(f"  {output_dir}/masks/train/")
        print(f"  {output_dir}/masks/val/")
        print("Masks should be PNG with pixel values 0=CLEAR, 1=CLOUDY, 2=NOT_VISIBLE")

    print(f"\nDataset prepared at: {output_dir}")
    print("Structure:")
    print(f"  {output_dir}/images/train/*.jpg")
    print(f"  {output_dir}/images/val/*.jpg")
    print(f"  {output_dir}/masks/train/*.png")
    print(f"  {output_dir}/masks/val/*.png")

# ============================================================
# MAIN
# ============================================================
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, help="Source cloud-38 images directory")
    parser.add_argument("--output", required=True, help="Output prepared dataset directory")
    parser.add_argument("--model", help="Optional: TFLite model for pseudo-mask generation")
    parser.add_argument("--img_size", type=int, default=224)
    args = parser.parse_args()

    prepare_dataset(args.source, args.output, args.model)


if __name__ == "__main__":
    main()