#!/usr/bin/env python3
"""
Train DeepLabV3+ MobileNetV3-Small for Cloud Masking (3-class)
Exports to TFLite for Pi 3B+ deployment.

Classes: 0=CLEAR, 1=CLOUDY, 2=NOT_VISIBLE
Input: 224x224x3 (or 512x512x3 for better accuracy)
Output: TFLite model (~4MB quantized)

Run on GPU machine (Colab, local RTX, etc.):
  python train_deeplabv3_mobilenetv3.py --data_dir /path/to/cloud-38 --epochs 50 --batch 16
"""

import os
import argparse
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, optimizers, callbacks
from tensorflow.keras.applications import MobileNetV3Small
from tensorflow.keras.utils import Sequence
import cv2
from pathlib import Path

# ============================================================
# CONFIG
# ============================================================
IMG_SIZE = 224           # 224 for speed, 512 for accuracy
BATCH_SIZE = 16
EPOCHS = 50
LR = 1e-3
NUM_CLASSES = 3          # CLEAR, CLOUDY, NOT_VISIBLE
CLASS_NAMES = ["CLEAR", "CLOUDY", "NOT_VISIBLE"]

# Class weights (adjust if imbalanced)
CLASS_WEIGHTS = {0: 1.0, 1: 1.0, 2: 1.0}

# ============================================================
# DATA LOADER (cloud-38 structure)
# ============================================================
class Cloud38Sequence(Sequence):
    def __init__(self, data_dir, split="train", batch_size=BATCH_SIZE, img_size=IMG_SIZE, augment=False):
        self.data_dir = Path(data_dir)
        self.batch_size = batch_size
        self.img_size = img_size
        self.augment = augment

        # Expected structure:
        # data_dir/
        #   images/
        #     train/IMG_001.jpg, ...
        #     val/IMG_002.jpg, ...
        #   masks/
        #     train/IMG_001.png (0,1,2 values), ...
        #     val/IMG_002.png, ...

        img_dir = self.data_dir / "images" / split
        mask_dir = self.data_dir / "masks" / split

        self.image_paths = sorted(list(img_dir.glob("*.jpg")) + list(img_dir.glob("*.png")))
        self.mask_paths = []
        for ip in self.image_paths:
            mp = mask_dir / (ip.stem + ".png")
            if mp.exists():
                self.mask_paths.append(mp)
            else:
                # Try same extension
                mp = mask_dir / ip.name
                if mp.exists():
                    self.mask_paths.append(mp)
                else:
                    raise FileNotFoundError(f"No mask for {ip}")

        assert len(self.image_paths) == len(self.mask_paths), "Image/mask count mismatch"
        print(f"[{split}] Loaded {len(self.image_paths)} samples")

    def __len__(self):
        return int(np.ceil(len(self.image_paths) / self.batch_size))

    def __getitem__(self, idx):
        start = idx * self.batch_size
        end = min(start + self.batch_size, len(self.image_paths))

        batch_imgs = []
        batch_masks = []

        for i in range(start, end):
            # Load image
            img = cv2.imread(str(self.image_paths[i]))
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = cv2.resize(img, (self.img_size, self.img_size), interpolation=cv2.INTER_LINEAR)
            img = img.astype(np.float32) / 255.0

            # Load mask (single channel, values 0,1,2)
            mask = cv2.imread(str(self.mask_paths[i]), cv2.IMREAD_GRAYSCALE)
            mask = cv2.resize(mask, (self.img_size, self.img_size), interpolation=cv2.INTER_NEAREST)
            # Ensure values are 0,1,2
            mask = np.clip(mask, 0, 2).astype(np.uint8)

            # Augmentation
            if self.augment:
                if np.random.rand() > 0.5:
                    img = np.fliplr(img)
                    mask = np.fliplr(mask)
                if np.random.rand() > 0.5:
                    img = np.flipud(img)
                    mask = np.flipud(mask)
                # Random brightness/contrast
                img = img * np.random.uniform(0.8, 1.2) + np.random.uniform(-0.1, 0.1)
                img = np.clip(img, 0, 1)

            batch_imgs.append(img)
            batch_masks.append(mask)

        # One-hot encode masks
        batch_imgs = np.array(batch_imgs, dtype=np.float32)
        batch_masks = np.array(batch_masks, dtype=np.int32)
        batch_masks_onehot = tf.one_hot(batch_masks, NUM_CLASSES).numpy()

        return batch_imgs, batch_masks_onehot

    def on_epoch_end(self):
        # Shuffle
        indices = np.arange(len(self.image_paths))
        np.random.shuffle(indices)
        self.image_paths = [self.image_paths[i] for i in indices]
        self.mask_paths = [self.mask_paths[i] for i in indices]


# ============================================================
# MODEL: DeepLabV3+ MobileNetV3-Small
# ============================================================
def build_deeplabv3_mobilenetv3(input_shape=(IMG_SIZE, IMG_SIZE, 3), num_classes=NUM_CLASSES):
    """DeepLabV3+ with MobileNetV3-Small backbone."""

    # Backbone
    backbone = MobileNetV3Small(
        input_shape=input_shape,
        include_top=False,
        weights="imagenet",
        minimalistic=False,
        alpha=1.0
    )

    # Freeze early layers
    for layer in backbone.layers[:80]:
        layer.trainable = False

    # Get feature maps at different scales
    # MobileNetV3Small layer names for skip connections
    # Use high-level features + low-level features
    low_level_feat = backbone.get_layer("expanded_conv_project_BN").output  # ~56x56
    high_level_feat = backbone.output  # ~7x7

    # ASPP (Atrous Spatial Pyramid Pooling)
    def aspp_block(x, filters=256, rates=[6, 12, 18]):
        """ASPP module."""
        # 1x1 conv
        y1 = layers.Conv2D(filters, 1, padding="same", use_bias=False)(x)
        y1 = layers.BatchNormalization()(y1)
        y1 = layers.Activation("relu")(y1)

        # 3x3 dilated convs
        y2 = layers.Conv2D(filters, 3, padding="same", dilation_rate=rates[0], use_bias=False)(x)
        y2 = layers.BatchNormalization()(y2)
        y2 = layers.Activation("relu")(y2)

        y3 = layers.Conv2D(filters, 3, padding="same", dilation_rate=rates[1], use_bias=False)(x)
        y3 = layers.BatchNormalization()(y3)
        y3 = layers.Activation("relu")(y3)

        y4 = layers.Conv2D(filters, 3, padding="same", dilation_rate=rates[2], use_bias=False)(x)
        y4 = layers.BatchNormalization()(y4)
        y4 = layers.Activation("relu")(y4)

        # Global average pooling
        y5 = layers.GlobalAveragePooling2D()(x)
        y5 = layers.Reshape((1, 1, x.shape[-1]))(y5)
        y5 = layers.Conv2D(filters, 1, padding="same", use_bias=False)(y5)
        y5 = layers.BatchNormalization()(y5)
        y5 = layers.Activation("relu")(y5)
        y5 = layers.UpSampling2D(size=(x.shape[1], x.shape[2]), interpolation="bilinear")(y5)

        # Concatenate
        y = layers.Concatenate()([y1, y2, y3, y4, y5])
        y = layers.Conv2D(filters, 1, padding="same", use_bias=False)(y)
        y = layers.BatchNormalization()(y)
        y = layers.Activation("relu")(y)
        return y

    # Apply ASPP to high-level features
    aspp = aspp_block(high_level_feat, filters=256)

    # Decoder: upsample ASPP to low-level feature resolution
    aspp_up = layers.UpSampling2D(
        size=(int(low_level_feat.shape[1] / aspp.shape[1]), int(low_level_feat.shape[2] / aspp.shape[2])),
        interpolation="bilinear"
    )(aspp)

    # Process low-level features
    low_level = layers.Conv2D(48, 1, padding="same", use_bias=False)(low_level_feat)
    low_level = layers.BatchNormalization()(low_level)
    low_level = layers.Activation("relu")(low_level)

    # Concatenate
    decoder = layers.Concatenate()([aspp_up, low_level])
    decoder = layers.Conv2D(256, 3, padding="same", use_bias=False)(decoder)
    decoder = layers.BatchNormalization()(decoder)
    decoder = layers.Activation("relu")(decoder)
    decoder = layers.Conv2D(256, 3, padding="same", use_bias=False)(decoder)
    decoder = layers.BatchNormalization()(decoder)
    decoder = layers.Activation("relu")(decoder)

    # Final upsample to input resolution
    logits = layers.Conv2D(num_classes, 1, padding="same")(decoder)
    logits = layers.UpSampling2D(
        size=(input_shape[0] // logits.shape[1], input_shape[1] // logits.shape[2]),
        interpolation="bilinear"
    )(logits)

    # Softmax output
    outputs = layers.Activation("softmax")(logits)

    model = models.Model(inputs=backbone.input, outputs=outputs, name="deeplabv3plus_mobilenetv3")
    return model


# ============================================================
# LOSS & METRICS
# ============================================================
def dice_coef(y_true, y_pred, smooth=1e-6):
    """Dice coefficient for segmentation."""
    y_true_f = tf.keras.backend.flatten(y_true)
    y_pred_f = tf.keras.backend.flatten(y_pred)
    intersection = tf.keras.backend.sum(y_true_f * y_pred_f)
    return (2. * intersection + smooth) / (tf.keras.backend.sum(y_true_f) + tf.keras.backend.sum(y_pred_f) + smooth)


def dice_loss(y_true, y_pred):
    return 1 - dice_coef(y_true, y_pred)


def combined_loss(y_true, y_pred):
    """CrossEntropy + Dice loss."""
    ce = tf.keras.losses.CategoricalCrossentropy()(y_true, y_pred)
    dl = dice_loss(y_true, y_pred)
    return ce + dl


# ============================================================
# TRAINING
# ============================================================
def train(data_dir, epochs=EPOCHS, batch_size=BATCH_SIZE, img_size=IMG_SIZE, output_dir="models"):
    os.makedirs(output_dir, exist_ok=True)

    # Data
    train_seq = Cloud38Sequence(data_dir, "train", batch_size, img_size, augment=True)
    val_seq = Cloud38Sequence(data_dir, "val", batch_size, img_size, augment=False)

    # Model
    model = build_deeplabv3_mobilenetv3((img_size, img_size, 3), NUM_CLASSES)
    model.summary()

    # Compile
    model.compile(
        optimizer=optimizers.Adam(LR),
        loss=combined_loss,
        metrics=["accuracy", dice_coef]
    )

    # Callbacks
    cb = [
        callbacks.ModelCheckpoint(
            os.path.join(output_dir, "deeplabv3_mobilenetv3_best.keras"),
            monitor="val_dice_coef", mode="max", save_best_only=True, verbose=1
        ),
        callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=5, min_lr=1e-6, verbose=1),
        callbacks.EarlyStopping(monitor="val_loss", patience=15, restore_best_weights=True, verbose=1),
        callbacks.CSVLogger(os.path.join(output_dir, "training_log.csv")),
        callbacks.TensorBoard(log_dir=os.path.join(output_dir, "logs"))
    ]

    # Train
    history = model.fit(
        train_seq,
        validation_data=val_seq,
        epochs=epochs,
        class_weight=CLASS_WEIGHTS,
        callbacks=cb,
        verbose=1
    )

    # Save final model
    model.save(os.path.join(output_dir, "deeplabv3_mobilenetv3_final.keras"))
    print(f"Model saved to {output_dir}")

    return model, history


# ============================================================
# TFLITE EXPORT (for Pi 3B+)
# ============================================================
def export_tflite(model_path, output_path, img_size=IMG_SIZE, quantize=True):
    """Export Keras model to TFLite with optional quantization."""
    model = tf.keras.models.load_model(model_path, custom_objects={
        "dice_coef": dice_coef,
        "dice_loss": dice_loss,
        "combined_loss": combined_loss
    })

    converter = tf.lite.TFLiteConverter.from_keras_model(model)

    if quantize:
        # Full integer quantization (fastest on Pi)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_ops = [
            tf.lite.OpsSet.TFLITE_BUILTINS_INT8,
            tf.lite.OpsSet.TFLITE_BUILTINS
        ]
        converter.inference_input_type = tf.uint8
        converter.inference_output_type = tf.uint8

        # Representative dataset for calibration
        def representative_dataset():
            for i in range(100):
                yield [np.random.rand(1, img_size, img_size, 3).astype(np.float32)]

        converter.representative_dataset = representative_dataset

    tflite_model = converter.convert()

    with open(output_path, "wb") as f:
        f.write(tflite_model)

    print(f"TFLite model saved: {output_path} ({len(tflite_model)/1024:.1f} KB)")

    # Test inference
    interpreter = tf.lite.Interpreter(model_path=output_path)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    print(f"Input: {input_details}")
    print(f"Output: {output_details}")

    return tflite_model


# ============================================================
# MAIN
# ============================================================
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", required=True, help="Path to cloud-38 dataset (images/ + masks/)")
    parser.add_argument("--epochs", type=int, default=EPOCHS)
    parser.add_argument("--batch", type=int, default=BATCH_SIZE)
    parser.add_argument("--img_size", type=int, default=IMG_SIZE)
    parser.add_argument("--output_dir", default="models")
    parser.add_argument("--skip_train", action="store_true", help="Only export existing model")
    parser.add_argument("--model_path", default="models/deeplabv3_mobilenetv3_best.keras")
    args = parser.parse_args()

    if not args.skip_train:
        print("="*60)
        print("TRAINING DeepLabV3+ MobileNetV3-Small")
        print("="*60)
        train(args.data_dir, args.epochs, args.batch, args.img_size, args.output_dir)

    print("="*60)
    print("EXPORTING TFLITE")
    print("="*60)
    export_tflite(
        args.model_path,
        os.path.join(args.output_dir, "neuronex_deeplabv3_mobilenetv3.tflite"),
        args.img_size,
        quantize=True
    )

    print("="*60)
    print("DONE - Copy .tflite to Pi: /home/sameer/neuronex/models/neuronex.tflite")
    print("="*60)


if __name__ == "__main__":
    main()