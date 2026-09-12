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

import base64
import threading
import urllib.request
import json

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
VERCEL_APP_URL = os.environ.get("VERCEL_APP_URL", "").rstrip("/") # URL Aplikasi Next.js di Vercel

# Global variable model & telemetri terbaru
model = None
latest_telemetry = {
    "plant_status": "safe",
    "threat_detected": False,
    "ulat_grayak_count": 0,
    "biopesticide_level": 85,
    "relay_active": False,
    "temp": 28.5,
    "last_detection_time": "Belum ada deteksi",
    "image_base64": None,
    "detections": []
}

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
            print(f"[BESTARI WEBHOOK] Berhasil terkirim ke Vercel: {response.status}")
    except Exception as e:
        print(f"[BESTARI WEBHOOK WARN] Gagal mengirim ke Vercel ({url}): {e}")

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
        "conf_threshold": CONF_THRESHOLD,
        "vercel_webhook": VERCEL_APP_URL or "Belum Diatur (Set VERCEL_APP_URL env var)"
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

                threat_keywords = ["ulat", "grayak", "armyworm", "larva", "damage", "egg", "frass"]
                if any(k in class_name.lower() for k in threat_keywords) or cls_id in [0, 1, 2, 3]:
                    ulat_grayak_count += 1
                    is_threat_detected = True

        # Tentukan status tanaman berdasarkan deteksi hama
        plant_status = "warning" if is_threat_detected else "safe"
        
        # Keputusan otomatis untuk Relay Mini Pump Biopestisida (GPIO 14 ESP32)
        relay_action = "TRIGGER_SPRAY" if is_threat_detected else "IDLE"

        # Encode gambar ke Base64 untuk Webhook Vercel & Dashboard UI
        img_b64 = "data:image/jpeg;base64," + base64.b64encode(image_bytes).decode("utf-8")
        current_time_str = time.strftime("%H:%M WIB", time.localtime())

        # Update Telemetri Global In-Memory
        global latest_telemetry
        latest_telemetry.update({
            "plant_status": plant_status,
            "threat_detected": is_threat_detected,
            "ulat_grayak_count": ulat_grayak_count,
            "relay_active": is_threat_detected,
            "last_detection_time": f"Hari ini, {current_time_str}",
            "image_base64": img_b64,
            "detections": detections
        })

        # Payload Lengkap ke Vercel App
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

        # Kirim ke Vercel di Background Thread (agar ESP32 tidak menunggu lama)
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
        return jsonify({"error": f"Gagal memproses gambar: {str(e)}"}), 500

@app.route('/status/latest', methods=['GET'])
def get_latest_status():
    """Endpoint status telemetri sejalan dengan frontend BESTARI."""
    return jsonify({
        "plant_status": latest_telemetry["plant_status"],
        "pest_detected": latest_telemetry["threat_detected"],
        "ulat_grayak_count": latest_telemetry["ulat_grayak_count"],
        "biopesticide_level": latest_telemetry["biopesticide_level"],
        "mode": "auto",
        "esp32_connected": True,
        "relay_active": latest_telemetry["relay_active"],
        "temp": latest_telemetry["temp"],
        "last_detection_time": latest_telemetry["last_detection_time"],
        "latest_image": latest_telemetry["image_base64"],
        "camera_feeds": [
          {
            "cam_id": "Cam 1",
            "name": "Bedengan Utama Zone A1",
            "image_url": latest_telemetry["image_base64"] or "/mock_cam1.jpg",
            "status": "active",
            "last_capture_time": latest_telemetry["last_detection_time"]
          }
        ]
    })

if __name__ == "__main__":
    load_yolo_model()
    port = int(os.environ.get("PORT", 5000))
    print(f"=== [BESTARI AI SERVER] Berjalan di port {port} ===")
    app.run(host="0.0.0.0", port=port, debug=False)
