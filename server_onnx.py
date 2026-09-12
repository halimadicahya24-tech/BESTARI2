"""
===============================================================================
  BESTARI - ONNX Ultra-Lightweight AI Server
===============================================================================
  Deskripsi: Server Flask berbasis ONNXRuntime (Ukuran ~20MB, tanpa PyTorch)
             Sangat cocok untuk deployment gratis di PythonAnywhere / VPS RAM kecil.
===============================================================================
"""

import os
import io
import time
import base64
import threading
import urllib.request
import json
from pathlib import Path
from flask import Flask, request, jsonify
from PIL import Image
import numpy as np

try:
    import onnxruntime as ort
except ImportError:
    raise ImportError("Pustaka 'onnxruntime' belum terpasang. Jalankan: pip install onnxruntime")

app = Flask(__name__)

# Mengatur CORS secara native tanpa ketergantungan library tambahan (flask-cors)
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    return response

# Konfigurasi Path Model ONNX & Ambang Batas
MODEL_PATH = os.environ.get("ONNX_MODEL_PATH", "best.onnx")
CONF_THRESHOLD = float(os.environ.get("CONF_THRESHOLD", 0.50))
VERCEL_APP_URL = os.environ.get("VERCEL_APP_URL", "").rstrip("/")

# Nama Kelas Dataset BESTARI
CLASS_NAMES = [
    'fall-armyworm-egg',
    'fall-armyworm-frass',
    'fall-armyworm-larva',
    'fall-armyworm-larval-damage',
    'healthy-maize',
    'maize-streak-disease'
]

# Kata kunci hama yang memicu penyemprotan biopestisida
THREAT_KEYWORDS = ["egg", "frass", "larva", "damage", "ulat", "grayak"]

session = None
input_name = None

def forward_to_vercel(payload):
    """Mengirim hasil deteksi dan foto ke Vercel App secara asynchronous"""
    if not VERCEL_APP_URL:
        return
    try:
        url = f"{VERCEL_APP_URL}/api/detections"
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            print(f"[BESTARI ONNX WEBHOOK] Berhasil terkirim ke Vercel: {response.status}")
    except Exception as e:
        print(f"[BESTARI ONNX WEBHOOK WARN] Gagal mengirim ke Vercel ({url}): {e}")

def load_onnx_model():
    global session, input_name
    if session is not None:
        return
        
    model_file = Path(MODEL_PATH)
    if not model_file.exists():
        # Cek lokasi alternatif jika dipanggil dari repositori
        alt_path = Path("runs/detect/runs/bestari_yolo/bestari_ulat_grayak_model/weights/best.onnx")
        if alt_path.exists():
            model_file = alt_path

    print(f"[BESTARI ONNX AI] Memuat model: {model_file}")
    session = ort.InferenceSession(str(model_file), providers=['CPUExecutionProvider'])
    input_name = session.get_inputs()[0].name
    print("[BESTARI ONNX AI] Model ONNX berhasil diinisialisasi!")

# Otomatis muat model saat server di-import oleh WSGI / PythonAnywhere
try:
    load_onnx_model()
except Exception as e:
    print(f"[BESTARI ONNX AI] Warning: Belum bisa memuat model saat startup: {e}")

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "status": "online",
        "engine": "ONNXRuntime (Ultra-Lightweight)",
        "system": "BESTARI Pest Monitoring AI Server",
        "conf_threshold": CONF_THRESHOLD,
        "classes": CLASS_NAMES
    })

@app.route('/detect', methods=['POST'])
def detect_pest():
    if session is None:
        try:
            load_onnx_model()
        except Exception as e:
            return jsonify({"error": f"Model ONNX gagal diinisialisasi: {str(e)}"}), 500

    if 'image' not in request.files and not request.data:
        return jsonify({"error": "Tidak ada gambar dikirim"}), 400

    try:
        start_time = time.time()
        
        # Read Image File
        if 'image' in request.files:
            file = request.files['image']
            image_bytes = file.read()
        else:
            image_bytes = request.data

        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        orig_w, orig_h = pil_img.size
        
        # Preprocessing Gambar untuk YOLO (640x640)
        img_resized = pil_img.resize((640, 640))
        img_np = np.array(img_resized).astype(np.float32) / 255.0  # Normalisasi 0.0 - 1.0
        img_np = np.transpose(img_np, (2, 0, 1))                   # HWC ke CHW
        img_np = np.expand_dims(img_np, axis=0)                    # Batch size 1: (1, 3, 640, 640)

        # Run ONNX Inference
        outputs = session.run(None, {input_name: img_np})
        output_tensor = outputs[0][0]  # Shape: (10, 8400) -> [x, y, w, h, score_cls0, score_cls1, ...]

        # Parsing Deteksi YOLOv8 Output
        detections = []
        ulat_grayak_count = 0
        is_threat_detected = False

        # Output shape is (4 + num_classes, 8400)
        num_boxes = output_tensor.shape[1]
        
        for i in range(num_boxes):
            box_data = output_tensor[:, i]
            cx, cy, w, h = box_data[:4]
            class_scores = box_data[4:]
            
            cls_id = int(np.argmax(class_scores))
            conf = float(class_scores[cls_id])
            
            if conf >= CONF_THRESHOLD:
                class_name = CLASS_NAMES[cls_id] if cls_id < len(CLASS_NAMES) else f"class_{cls_id}"
                
                # Bounding Box standar (x1, y1, x2, y2) disesuaikan ke resolusi asli
                x1 = float((cx - w / 2) * (orig_w / 640.0))
                y1 = float((cy - h / 2) * (orig_h / 640.0))
                x2 = float((cx + w / 2) * (orig_w / 640.0))
                y2 = float((cy + h / 2) * (orig_h / 640.0))

                detections.append({
                    "class_id": cls_id,
                    "class_name": class_name,
                    "confidence": round(conf, 4),
                    "bbox": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)]
                })

                if any(k in class_name.lower() for k in THREAT_KEYWORDS) or cls_id in [0, 1, 2, 3]:
                    ulat_grayak_count += 1
                    is_threat_detected = True

        inference_time_ms = round((time.time() - start_time) * 1000, 2)
        plant_status = "warning" if is_threat_detected else "safe"
        relay_action = "TRIGGER_SPRAY" if is_threat_detected else "IDLE"

        # Encode gambar ke Base64 untuk Webhook Vercel & Dashboard UI
        img_b64 = "data:image/jpeg;base64," + base64.b64encode(image_bytes).decode("utf-8")
        current_time_str = time.strftime("%H:%M WIB", time.localtime())

        vercel_payload = {
            "cam_id": "Cam 1",
            "plant_status": plant_status,
            "threat_detected": is_threat_detected,
            "ulat_grayak_count": ulat_grayak_count,
            "relay_action": relay_action,
            "inference_time_ms": inference_time_ms,
            "total_detections": len(detections),
            "detections": detections,
            "image_url": img_b64,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "formatted_time": current_time_str
        }

        # Kirim ke Vercel di Background Thread
        if VERCEL_APP_URL:
            threading.Thread(target=forward_to_vercel, args=(vercel_payload,), daemon=True).start()

        return jsonify({
            "status": "success",
            "plant_status": plant_status,
            "threat_detected": is_threat_detected,
            "ulat_grayak_count": ulat_grayak_count,
            "relay_action": relay_action,
            "inference_time_ms": inference_time_ms,
            "total_detections": len(detections),
            "detections": detections
        })

    except Exception as e:
        return jsonify({"error": f"Gagal memproses ONNX inference: {str(e)}"}), 500

if __name__ == "__main__":
    load_onnx_model()
    port = int(os.environ.get("PORT", 5000))
    print(f"=== [BESTARI ONNX SERVER] Berjalan di port {port} ===")
    app.run(host="0.0.0.0", port=port, debug=False)
