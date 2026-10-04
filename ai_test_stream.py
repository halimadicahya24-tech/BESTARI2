import cv2
from ultralytics import YOLO
from pathlib import Path

# Cek lokasi file bobot model hasil training Anda
MODEL_PATH = "runs/pest_detection/bestari_yolov8s_pest/weights/best.pt"
ALT_PATH_1 = "runs/detect/runs/bestari_yolo/bestari_ulat_grayak_model/weights/best.pt"
ALT_PATH_2 = "runs/bestari_yolo/bestari_ulat_grayak_model/weights/best.pt"
BASE_PATH = "yolov8n.pt"

if Path(MODEL_PATH).exists():
    model_file = MODEL_PATH
elif Path(ALT_PATH_1).exists():
    model_file = ALT_PATH_1
elif Path(ALT_PATH_2).exists():
    model_file = ALT_PATH_2
else:
    model_file = BASE_PATH

print(f"🌿 Memuat model YOLO dari: {model_file}")
model = YOLO(model_file)

# Inisialisasi Webcam menggunakan backend DirectShow (cv2.CAP_DSHOW) untuk Windows
cap = None
cam_index = 0

for index in [0, 1, 2]:
    print(f"🎥 Mencoba membuka kamera ID {index} (DirectShow)...")
    temp_cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
    if temp_cap.isOpened():
        ret, frame = temp_cap.read()
        if ret and frame is not None:
            cap = temp_cap
            cam_index = index
            print(f"✅ Kamera ID {cam_index} berhasil terhubung!")
            break
        temp_cap.release()

if cap is None or not cap.isOpened():
    print("❌ Gagal membuka kamera. Pastikan webcam tidak sedang digunakan oleh aplikasi lain (Zoom, Teams, Browser).")
    exit(1)

# Set resolusi kamera ke 640x480 agar lancar & stabil
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

print("🚀 Live Webcam Test Aktif! Tekan 'q' pada jendela video untuk keluar.")

while cap.isOpened():
    ret, frame = cap.read()
    if not ret or frame is None:
        print("⚠️ Gagal mengambil frame dari webcam.")
        break

    # Jalankan deteksi YOLOv8 pada frame kamera
    results = model(frame, conf=0.5)

    # Gambar bounding box di layar
    annotated_frame = results[0].plot()

    cv2.imshow("BESTARI AI - Live Webcam Test (Tekan Q untuk Keluar)", annotated_frame)

    # Tekan 'q' pada keyboard untuk keluar
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
print("👋 Program live streaming selesai.")
