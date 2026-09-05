# 🤖 Modul AI & Pelatihan Model YOLO - Projek BESTARI 🌿
### Samsung Solve for Tomorrow (SFT) 2026 — SMAN Sumatera Selatan

Modul ini menyediakan skrip Python lengkap untuk melatih (*training*), mengevaluasi, mengekspor, serta mendistribusikan model Computer Vision **YOLOv8 / YOLO11** untuk deteksi otomatis **Hama Ulat Grayak (*Spodoptera frugiperda*)** pada sistem monitoring BESTARI.

---

## 📁 Struktur Direktori AI BESTARI

```text
bestari/
├── train_yolo.py         # Script utama pelatihan model YOLO & otomatisasi ekspor
├── server_yolo.py        # Server Backend Flask AI Inference untuk ESP32-CAM & Web UI
├── dataset/              # Folder Dataset Gambar & Label
│   ├── data.yaml         # Konfigurasi kelas & path dataset BESTARI
│   ├── train/            # Dataset Pelatihan (images/ & labels/)
│   └── valid/            # Dataset Validasi (images/ & labels/)
├── requirements_ai.txt   # Dependencies pustaka Python (ultralytics, torch, dll)
└── runs/bestari_yolo/    # Output hasil pelatihan, grafik metrik, dan bobot (weights)
```

---

## 🚀 Panduan Persiapan & Installasi

### 1. Persiapkan Environment Python
Disarankan menggunakan Python versi 3.9, 3.10, atau 3.11.

```bash
# Install seluruh pustaka yang dibutuhkan
pip install -r requirements_ai.txt
```

### 2. Struktur Dataset YOLO
Pastikan folder `dataset/` memiliki struktur standar Roboflow / YOLO sebagai berikut:

```text
dataset/
├── data.yaml
├── train/
│   ├── images/  (file .jpg / .png)
│   └── labels/  (file .txt annotation)
└── valid/
    ├── images/
    └── labels/
```

**Isi file `dataset/data.yaml`:**
```yaml
path: ./dataset
train: train/images
val: valid/images

nc: 3
names:
  0: ulat_grayak   # Hama Ulat Grayak
  1: daun_sehat    # Daun tanaman segar
  2: daun_rusak    # Daun rusak terkena gigitan hama
```

---

## 🏋️ Cara Melatih Model YOLO (`train_yolo.py`)

### 1. Pelatihan Dasar (Quick Start)
Jalankan perintah berikut untuk melatih model dasar `yolov8n.pt` selama 50 epoch:

```bash
python train_yolo.py --epochs 50 --batch 16
```

### 2. Pelatihan Lanjutan (Custom Parameters)
Anda dapat menyesuaikan parameter sesuai kemampuan hardware GPU:

```bash
python train_yolo.py \
  --data dataset/data.yaml \
  --model yolov8s.pt \
  --epochs 100 \
  --imgsz 640 \
  --batch 16 \
  --device 0 \
  --name bestari_exp_v1
```

### 📋 Penjelasan Opsi Parameter:
* `--model`: Pilih varian YOLO (`yolov8n.pt` paling ringan untuk edge, `yolov8s.pt` lebih akurat).
* `--imgsz`: Ukuran piksel gambar (640px optimal untuk ESP32-CAM).
* `--device`: Masukkan `0` jika menggunakan NVIDIA GPU CUDA, atau `cpu` jika tanpa GPU.
* `--export`: Otomatis mengekspor hasil ke format `.onnx` dan `.tflite` setelah pelatihan selesai.

---

## 📊 Hasil Output & Bobot Model

Setelah proses pelatihan selesai, file bobot model paling optimal (*best checkpoint*) akan tersimpan di:
* `runs/bestari_yolo/bestari_ulat_grayak_model/weights/best.pt` (PyTorch)
* `runs/bestari_yolo/bestari_ulat_grayak_model/weights/best.onnx` (ONNX format)

Di dalam folder `runs/bestari_yolo/bestari_ulat_grayak_model/` juga akan terdapat grafik otomatis:
- `results.png` (Grafik loss & metrik mAP)
- `confusion_matrix.png` (Matriks presisi deteksi ulat vs daun)
- `val_batch0_labels.jpg` (Visualisasi bounding box validasi)

---

## 🔌 Menguji Model dengan Server Inference Flask (`server_yolo.py`)

Untuk menguji deteksi real-time atau menghubungkannya ke kamera ESP32-CAM & Aplikasi Frontend Dashboard BESTARI, jalankan server Flask:

```bash
python server_yolo.py
```

Server akan aktif di `http://localhost:5000` dengan endpoint:
1. `GET /` — Cek status server & model aktif.
2. `POST /detect` — Menerima file gambar dan mengembalikan JSON deteksi ulat grayak & aksi relay penyemprotan (`TRIGGER_SPRAY`).

---

## 👨‍💻 Kontributor tim SFT 2026
- **Fajrin Al Majid** (Lead Architect & AI Engineer)
- **Tim BESTARI SMAN Sumatera Selatan**
