import os, sys, json, time
sys.path.insert(0, '/home/sameer/neuronex/backup')
from backup import Classifier

Classifier.load()

image_root = sys.argv[1] if len(sys.argv) > 1 else '/home/sameer/neuranex/data/processed'
output_file = '/home/sameer/neuronex/classification_results_full.jsonl'

extensions = ('.jpg', '.jpeg', '.png', '.JPG', '.JPEG')
images = []
for root, dirs, files in os.walk(image_root):
    for f in files:
        if f.lower().endswith(extensions):
            rel_path = os.path.relpath(os.path.join(root, f), image_root)
            images.append(rel_path)

images.sort()
print(f"Found {len(images)} images under {image_root}...")

with open(output_file, 'w') as out:
    for i, rel_path in enumerate(images):
        fpath = os.path.join(image_root, rel_path)
        start = time.time()
        result = Classifier.classify(fpath)
        latency = (time.time() - start) * 1000
        record = {
            "file": rel_path,
            "class": result["class"],
            "confidence": result["confidence"],
            "latency_ms": round(latency, 1),
            "probs": result.get("probs", {})
        }
        out.write(json.dumps(record) + "\n")
        if (i + 1) % 50 == 0:
            print(f"  {i+1}/{len(images)}: {rel_path} -> {result['class']} ({result['confidence']:.1%})")

print(f"\nDone. Results in {output_file}")

counts = {"CLEAR": 0, "CLOUDY": 0, "NOT_VISIBLE": 0}
with open(output_file) as f:
    for line in f:
        counts[json.loads(line)["class"]] += 1
print(f"CLEAR: {counts['CLEAR']} | CLOUDY: {counts['CLOUDY']} | NOT_VISIBLE: {counts['NOT_VISIBLE']}")
EOF