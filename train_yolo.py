"""
===============================================================================
  BESTARI (Samsung Solve for Tomorrow 2026) - AI Pest Detection Model Trainer
  Script Training & Export Model YOLOv8 / YOLO11 untuk Deteksi Ulat Grayak
===============================================================================
  Penulis : Fajrin Al Majid & Tim BESTARI SMAN Sumatera Selatan
  Deskripsi: Script Python otomatis untuk melatih model Ultralytics YOLO 
             dalam mendeteksi Hama Ulat Grayak (Spodoptera frugiperda),
             Daun Sehat, dan Daun Rusak pada tanaman jagung/pertanian.
===============================================================================
"""

import os
import sys
import argparse
import logging
from pathlib import Path

# Set up clean logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("BESTARI-YOLO-Trainer")

def check_dependencies():
    """Memeriksa apakah pustaka ultralytics & torch sudah terpasang."""
    try:
        import torch
        import ultralytics
        logger.info(f"PyTorch Version   : {torch.__version__}")
        logger.info(f"Ultralytics Version: {ultralytics.__version__}")
        
        # Cek Akselerasi Hardware GPU/CUDA
        if torch.cuda.is_available():
            device_name = torch.cuda.get_device_name(0)
            logger.info(f"Hardware GPU Aktif: {device_name} (CUDA True)")
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            logger.info("Hardware GPU Aktif: Apple Silicon Metal (MPS True)")
        else:
            logger.warning("GPU tidak terdeteksi. Pelatihan akan berjalan pada CPU (mungkin lambat).")
            
        return torch, ultralytics
    except ImportError as e:
        logger.error("Pustaka 'ultralytics' atau 'torch' belum terpasang!")
        logger.error("Silakan install dengan perintah: pip install -r requirements_ai.txt")
        sys.exit(1)


def generate_default_data_yaml(yaml_path: str):
    """
    Membuat file konfigurasi data.yaml default untuk dataset BESTARI
    jika file tersebut belum ada di path yang ditentukan.
    """
    yaml_file = Path(yaml_path)
    if not yaml_file.exists():
        logger.info(f"File '{yaml_path}' tidak ditemukan. Membuat template data.yaml default...")
        yaml_file.parent.mkdir(parents=True, exist_ok=True)
        
        content = """# BESTARI - Dataset Configuration for YOLOv8/YOLO11
# Projek Samsung Solve for Tomorrow 2026 - Deteksi Ulat Grayak

path: ./dataset # Root direktori dataset
train: train/images # Path relatif gambar training
val: valid/images   # Path relatif gambar validasi
test: test/images   # Path relatif gambar testing (opsional)

# Jumlah Kelas & Label Nama Kelas
nc: 3
names:
  0: ulat_grayak   # Hama Ulat Grayak (Spodoptera frugiperda)
  1: daun_sehat    # Daun tanaman sehat tanpa serangan hama
  2: daun_rusak    # Daun tanaman menunjukkan kerusakan/gejala ulat
"""
        with open(yaml_file, 'w', encoding='utf-8') as f:
            f.write(content)
        logger.info(f"File template '{yaml_path}' berhasil dibuat!")


def verify_dataset_structure(data_yaml_path: str):
    """
    Memverifikasi keberadaan direktori gambar dan label sesuai file YAML.
    """
    import yaml
    
    yaml_file = Path(data_yaml_path)
    if not yaml_file.exists():
        logger.error(f"File konfigurasi dataset '{data_yaml_path}' tidak ditemukan!")
        return False
        
    with open(yaml_file, 'r', encoding='utf-8') as f:
        try:
            cfg = yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Gagal membaca YAML file: {e}")
            return False

    root_path = Path(cfg.get('path', '.'))
    if not root_path.is_absolute():
        root_path = (yaml_file.parent / root_path).resolve()
        
    train_imgs = root_path / cfg.get('train', 'train/images')
    val_imgs = root_path / cfg.get('val', 'valid/images')
    
    logger.info(f"Root Dataset Path : {root_path}")
    logger.info(f"Train Images Path : {train_imgs}")
    logger.info(f"Valid Images Path : {val_imgs}")
    
    has_train = train_imgs.exists() and any(train_imgs.iterdir()) if train_imgs.exists() else False
    has_val = val_imgs.exists() and any(val_imgs.iterdir()) if val_imgs.exists() else False
    
    if not has_train:
        logger.warning(f"Direktori train '{train_imgs}' masih kosong atau belum ada file gambar!")
    if not has_val:
        logger.warning(f"Direktori validasi '{val_imgs}' masih kosong atau belum ada file gambar!")
        
    return True


def train_bestari_yolo(args):
    """
    Fungsi utama untuk melatih model YOLOv8 / YOLO11 dengan konfigurasi teroptimasi untuk BESTARI.
    """
    torch, ultralytics = check_dependencies()
    from ultralytics import YOLO

    # 1. Persiapkan data.yaml & Verifikasi Dataset
    generate_default_data_yaml(args.data)
    verify_dataset_structure(args.data)

    logger.info(f"=== MEMULAI PELATIHAN MODEL YOLO BESTARI ===")
    logger.info(f"Base Model    : {args.model}")
    logger.info(f"Dataset Config: {args.data}")
    logger.info(f"Total Epochs  : {args.epochs}")
    logger.info(f"Image Size    : {args.imgsz}x{args.imgsz}")
    logger.info(f"Batch Size    : {args.batch}")
    logger.info(f"Device        : {args.device}")

    # 2. Load Pretrained YOLO Model
    model = YOLO(args.model)

    # 3. Jalankan Proses Training dengan Augmentasi Optimal Pertanian
    # Augmentasi warna HSV dan Flip disesuaikan untuk pencahayaan lapangan (outdoor/greenhouse)
    train_results = model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        project=args.project,
        name=args.name,
        patience=args.patience,
        save=True,
        plots=True,
        # Hyperparameter Augmentasi Data untuk Deteksi Hama
        hsv_h=0.015,     # Variasi Hue warna daun/hama
        hsv_s=0.7,       # Variasi Saturasi pencahayaan matahari
        hsv_v=0.4,       # Variasi Kecerahan (Value)
        degrees=15.0,    # Rotasi sudut daun
        fliplr=0.5,      # Flip horizontal
        flipud=0.2,      # Flip vertikal
        mosaic=1.0,      # Mosaic augmentation untuk ulat ukuran kecil
        mixup=0.1        # Mixup augmentation
    )

    logger.info("=== PELATIHAN SELESAI ===")
    
    # 4. Validasi & Evaluasi Model Hasil Training
    logger.info("Memulai Evaluasi Metrik Model (Validation)...")
    val_metrics = model.val()
    
    logger.info(f"Metrik Hasil Evaluasi BESTARI:")
    logger.info(f" - mAP@50     : {val_metrics.box.map50:.4f}")
    logger.info(f" - mAP@50-95  : {val_metrics.box.map:.4f}")
    logger.info(f" - Precision  : {val_metrics.box.mp:.4f}")
    logger.info(f" - Recall     : {val_metrics.box.mr:.4f}")

    # Path file weights terbaik (.pt)
    best_weights_path = Path(args.project) / args.name / "weights" / "best.pt"
    logger.info(f"Model Paling Optimal Disimpan Di: {best_weights_path}")

    # 5. Export Model (ONNX & TFLite) jika diaktifkan
    if args.export and best_weights_path.exists():
        export_model(best_weights_path, args.imgsz)
        
    return best_weights_path


def export_model(weights_path: Path, imgsz: int):
    """
    Mengekspor model PyTorch (.pt) ke format ONNX dan TFLite 
    untuk integrasi backend Flask / ESP32 AI Edge.
    """
    from ultralytics import YOLO
    
    logger.info(f"=== MENGEKSPOR MODEL UNTUK DEPLOYMENT (ONNX & TFLite) ===")
    model = YOLO(str(weights_path))

    # Export ke ONNX (Format standar untuk Flask backend / OpenCV DNN / Python API)
    try:
        onnx_file = model.export(format="onnx", imgsz=imgsz, dynamic=True)
        logger.info(f"Sukses Ekspor ONNX  : {onnx_file}")
    except Exception as e:
        logger.error(f"Gagal ekspor ONNX: {e}")

    # Export ke TFLite (Format ringan untuk Microcontroller / ESP32-S3 / Mobile)
    try:
        tflite_file = model.export(format="tflite", imgsz=imgsz)
        logger.info(f"Sukses Ekspor TFLite: {tflite_file}")
    except Exception as e:
        logger.error(f"Gagal ekspor TFLite (Membutuhkan tensorflow): {e}")


def main():
    parser = argparse.ArgumentParser(
        description="BESTARI - Script Pelatihan Model YOLOv8/YOLO11 Deteksi Hama Ulat Grayak"
    )
    
    parser.add_argument(
        "--data", type=str, default="dataset/data.yaml",
        help="Path ke file konfigurasi dataset data.yaml (default: dataset/data.yaml)"
    )
    parser.add_argument(
        "--model", type=str, default="yolov8n.pt",
        help="Model YOLO dasar yang digunakan: yolov8n.pt, yolov8s.pt, yolo11n.pt (default: yolov8n.pt)"
    )
    parser.add_argument(
        "--epochs", type=int, default=50,
        help="Jumlah iterasi pelatihan (default: 50)"
    )
    parser.add_argument(
        "--imgsz", type=int, default=640,
        help="Ukuran piksel input gambar (default: 640)"
    )
    parser.add_argument(
        "--batch", type=int, default=16,
        help="Ukuran batch size pelatihan (default: 16)"
    )
    parser.add_argument(
        "--patience", type=int, default=15,
        help="Jumlah epoch toleransi Early Stopping jika metrik tidak berkembang (default: 15)"
    )
    parser.add_argument(
        "--device", type=str, default="",
        help="ID Device GPU (contoh: 0 atau cuda:0) atau 'cpu' (default: auto detect)"
    )
    parser.add_argument(
        "--project", type=str, default="runs/bestari_yolo",
        help="Direktori penyimpanan hasil training (default: runs/bestari_yolo)"
    )
    parser.add_argument(
        "--name", type=str, default="bestari_ulat_grayak_model",
        help="Nama folder eksperiment training (default: bestari_ulat_grayak_model)"
    )
    parser.add_argument(
        "--no-export", dest="export", action="store_false",
        help="Matikan ekspor otomatis ke ONNX & TFLite setelah training"
    )
    
    parser.set_defaults(export=True)
    args = parser.parse_args()

    train_bestari_yolo(args)


if __name__ == "__main__":
    main()
