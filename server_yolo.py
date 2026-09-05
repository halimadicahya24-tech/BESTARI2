"""
===============================================================================
  BESTARI (Samsung Solve for Tomorrow 2026) - Flask AI YOLO Inference Server
===============================================================================
  Penulis : Fajrin Al Majid & Tim BESTARI SMAN Sumatera Selatan
  Deskripsi: Server Flask API untuk menerima gambar dari ESP32-CAM, 
             menjalankan deteksi real-time Hama Ulat Grayak menggunakan
             model YOLOv8/YOLO11, serta mengembalikan koordinat bounding box,
             skor kepastian (confidence), dan perintah Relay Pompa Biopestisida.
===============================================================================
"""

import os
import io
import time
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np

# Cek & Load Ultralytics YOLO
try:
    from ultralytics import YOLO
except ImportError:
    raise ImportError("Pustaka 'ultralytics' belum terpasang. Jalankan: pip install ultralytics")

app = Flask(__name__)
CORS(app)  # Izinkan Cross-Origin Requests dari Aplikasi Web BESTARI

# Konfigurasi Default Server & AI
MODEL_PATH = os.environ.get("YOLO_MODEL_PATH", "runs/bestari_yolo/bestari_ulat_grayak_model/weights/best.pt")
FALLBACK_MODEL_PATH = "yolov8n.pt"
CONF_THRESHOLD = float(os.environ.get("CONF_THRESHOLD", 0.65)) # Ambang batas kepastian deteksi (default: 65%)

# Global variable model
model = None

def load_yolo_model():
    global model
    target_path = Path(MODEL_PATH)
    if target_path.exists():
        print(f"[BESTARI AI] Memuat model hasil training: {target_path}")
        model = YOLO(str(target_path))
    else:
        print(f"[BESTARI AI] Model {target_path} belum ditemukan. Memuat base model: {FALLBACK_MODEL_PATH}")
        model = YOLO(FALLBACK_MODEL_PATH)

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "status": "online",
        "system": "BESTARI Pest Monitoring AI Server (Samsung Solve for Tomorrow 2026)",
        "model_loaded": MODEL_PATH if Path(MODEL_PATH).exists() else FALLBACK_MODEL_PATH,
        "conf_threshold": CONF_THRESHOLD
    })

@app.route('/detect', methods=['POST'])
def detect_pest():
    """
    Endpoint HTTP POST untuk mendeteksi ulat grayak dari tangkapan gambar ESP32-CAM.
    Menerima file gambar via Form Data ('image') atau byte raw.
    """
    if model is None:
        return jsonify({"error": "Model YOLO belum diinisialisasi"}), 500

    if 'image' not in request.files and not request.data:
        return jsonify({"error": "Tidak ada gambar dikirim (gunakan field 'image' multipart/form-data)"}), 400

    try:
        # Read Image File
        if 'image' in request.files:
            file = request.files['image']
            image_bytes = file.read()
        else:
            image_bytes = request.data

        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Run YOLO Inference
        start_time = time.time()
        results = model.predict(pil_img, conf=CONF_THRESHOLD)
        inference_time_ms = round((time.time() - start_time) * 1000, 2)

        detections = []
        ulat_grayak_count = 0
        is_threat_detected = False

        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls_id = int(box.cls[0])
                class_name = model.names[cls_id]
                conf = float(box.conf[0])
                bbox = box.xyxy[0].tolist()  # [x1, y1, x2, y2]

                detections.append({
                    "class_id": cls_id,
                    "class_name": class_name,
                    "confidence": round(conf, 4),
                    "bbox": [round(x, 1) for x in bbox]
                })

                if "ulat" in class_name.lower() or "grayak" in class_name.lower() or cls_id == 0:
                    ulat_grayak_count += 1
                    is_threat_detected = True

        # Tentukan status tanaman berdasarkan deteksi hama
        plant_status = "warning" if is_threat_detected else "safe"
        
        # Keputusan otomatis untuk Relay Mini Pump Biopestisida (GPIO 14 ESP32)
        relay_action = "TRIGGER_SPRAY" if is_threat_detected else "IDLE"

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
        return jsonify({"error": f"Gagal memproses gambar: {str(e)}"}), 500

@app.route('/status/latest', methods=['GET'])
def get_latest_status():
    """Endpoint status telemetri sejalan dengan frontend BESTARI."""
    return jsonify({
        "plant_status": "safe",
        "pest_detected": False,
        "biopesticide_level": 84,
        "mode": "auto",
        "esp32_connected": True,
        "relay_active": False,
        "temp": 28.5,
        "last_detection_time": "Hari ini, 07:30 WIB",
        "camera_feeds": [
          {"cam_id": "Cam 1", "image_url": "/mock_cam1.jpg", "status": "active"},
          {"cam_id": "Cam 2", "image_url": "/mock_cam2.jpg", "status": "active"},
          {"cam_id": "Cam 3", "image_url": "/mock_cam3.jpg", "status": "active"}
        ]
    })

if __name__ == "__main__":
    load_yolo_model()
    port = int(os.environ.get("PORT", 5000))
    print(f"=== [BESTARI AI SERVER] Berjalan di port {port} ===")
    app.run(host="0.0.0.0", port=port, debug=False)
