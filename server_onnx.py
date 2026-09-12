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
VERCEL_APP_URL = os.environ.get("VERCEL_APP_URL", "https://bestari-3.vercel.app").rstrip("/")

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

# Global state untuk telemetri & konfigurasi
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

system_config = {
    "confidence_threshold": CONF_THRESHOLD,
    "spray_duration_sec": 5,
    "auto_spray_enabled": True,
    "manual_pump_trigger_until": 0
}

def forward_to_vercel(payload):
    """Mengirim hasil deteksi dan foto ke Vercel App secara asynchronous"""
    if not VERCEL_APP_URL:
        print("[BESTARI WEBHOOK NOTICE] VERCEL_APP_URL belum diatur. Melewati pengiriman ke Vercel.")
        return
    try:
        url = f"{VERCEL_APP_URL}/api/detections"
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BESTARI-AI-Server/2.0'
            }
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            print(f"[BESTARI ONNX WEBHOOK] Berhasil terkirim ke Vercel ({url}): {response.status}")
    except Exception as e:
        print(f"[BESTARI ONNX WEBHOOK ERROR] Gagal mengirim ke Vercel ({url}): {e}")

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
        "vercel_webhook": VERCEL_APP_URL or "Belum Diatur",
        "classes": CLASS_NAMES
    })

@app.route('/config', methods=['GET', 'POST'])
def manage_config():
    global CONF_THRESHOLD, system_config
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        if 'confidence_threshold' in data:
            system_config['confidence_threshold'] = float(data['confidence_threshold'])
            CONF_THRESHOLD = system_config['confidence_threshold']
        if 'spray_duration_sec' in data:
            system_config['spray_duration_sec'] = int(data['spray_duration_sec'])
        if 'auto_spray_enabled' in data:
            system_config['auto_spray_enabled'] = bool(data['auto_spray_enabled'])
        return jsonify({"status": "success", "config": system_config})
    return jsonify({"status": "success", "config": system_config})

@app.route('/control/pump', methods=['POST'])
def manual_pump_control():
    data = request.get_json(silent=True) or {}
    duration = int(data.get('manual_pump_duration_sec', 5))
    system_config['manual_pump_trigger_until'] = time.time() + duration
    print(f"[BESTARI ONNX PUMP CONTROL] Pompa manual dipicu selama {duration} detik!")
    return jsonify({"status": "success", "message": f"Pompa dipicu selama {duration}s", "trigger_until": system_config['manual_pump_trigger_until']})

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
        "relay_active": latest_telemetry["relay_active"] or (time.time() < system_config['manual_pump_trigger_until']),
        "temp": latest_telemetry["temp"],
        "last_detection_time": latest_telemetry["last_detection_time"],
        "latest_image": latest_telemetry["image_base64"],
        "config": system_config,
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

        # Parsing Deteksi YOLOv8 Output (NumPy Vectorized - Ultra Fast)
        detections = []
        ulat_grayak_count = 0
        is_threat_detected = False

        class_scores = output_tensor[4:, :]  # Shape: (num_classes, 8400)
        max_scores = np.max(class_scores, axis=0)  # Shape: (8400,)
        cls_ids = np.argmax(class_scores, axis=0)  # Shape: (8400,)

        valid_mask = max_scores >= CONF_THRESHOLD
        valid_indices = np.where(valid_mask)[0]

        for i in valid_indices:
            cx, cy, w, h = output_tensor[:4, i]
            cls_id = int(cls_ids[i])
            conf = float(max_scores[i])

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
        
        # Cek Pemicuan Manual dari Dashboard Web
        is_manual_active = time.time() < system_config["manual_pump_trigger_until"]
        should_spray = is_threat_detected or is_manual_active

        plant_status = "warning" if should_spray else "safe"
        relay_action = "TRIGGER_SPRAY" if should_spray else "IDLE"
        spray_duration_ms = system_config["spray_duration_sec"] * 1000

        # Encode gambar ke Base64 untuk Webhook Vercel & Dashboard UI
        img_b64 = "data:image/jpeg;base64," + base64.b64encode(image_bytes).decode("utf-8")
        current_time_str = time.strftime("%H:%M WIB", time.localtime())

        # Baca Sensor Kelembaban Tanah dari Header ESP32-CAM (jika ada)
        soil_moisture_header = request.headers.get("X-Soil-Moisture")
        water_level = int(soil_moisture_header) if (soil_moisture_header and soil_moisture_header.isdigit()) else 60

        global latest_telemetry
        if should_spray:
            latest_telemetry["biopesticide_level"] = max(0, latest_telemetry["biopesticide_level"] - 1)

        latest_telemetry.update({
            "plant_status": plant_status,
            "threat_detected": is_threat_detected,
            "ulat_grayak_count": ulat_grayak_count,
            "relay_active": should_spray,
            "last_detection_time": f"Hari ini, {current_time_str}",
            "image_base64": img_b64,
            "detections": detections
        })

        vercel_payload = {
            "cam_id": "Cam 1",
            "plant_status": plant_status,
            "threat_detected": is_threat_detected,
            "ulat_grayak_count": ulat_grayak_count,
            "relay_action": relay_action,
            "spray_duration_ms": spray_duration_ms,
            "inference_time_ms": inference_time_ms,
            "water_level": water_level,
            "biopesticide_level": latest_telemetry["biopesticide_level"],
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
            "spray_duration_ms": spray_duration_ms,
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
