"""
================================================================================
BESTARI (Samsung Solve for Tomorrow 2026) - Script Training YOLOv8s Deteksi Hama
================================================================================
Deskripsi : Skrip Python modular & otomatis untuk preprocessing dataset, 
            pembuatan data.yaml, training YOLOv8s dengan augmentasi on-the-fly,
            serta evaluasi otomatis pada dataset test.

Fitur Utama:
  1. Penanganan Path Lintas Platform (Windows, Linux, Google Colab) menggunakan pathlib.
  2. Pembuatan file label kosong (0-byte) otomatis untuk sampel negatif (no_pest).
  3. Pembagian otomatis dataset (80% Train, 10% Validation, 10% Test).
  4. Generasi otomatis file data.yaml.
  5. Training YOLOv8s (imgsz=1280, epochs=100, batch=8) dengan augmentasi terlatih.
  6. Evaluasi metrik otomatis pada split Test.
================================================================================
"""

import os
import sys
import shutil
import random
import logging
from pathlib import Path
from typing import List, Tuple, Dict
import yaml

# Konfigurasi Logging yang Informatif & Rapi
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("BESTARI-PestDetector")

# Format Ekstensi Gambar yang Didukung
VALID_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp', '.JPG', '.JPEG', '.PNG'}


class DatasetPipeline:
    """
    Kelas untuk menangani seluruh alur kerja Preprocessing & Splitting Dataset.
    """
    def __init__(self, pest_dir: Path, no_pest_dir: Path, output_dir: Path):
        self.pest_dir = Path(pest_dir)
        self.no_pest_dir = Path(no_pest_dir)
        self.output_dir = Path(output_dir)

        # Path Output Standar YOLOv8
        self.images_dir = self.output_dir / "images"
        self.labels_dir = self.output_dir / "labels"

    def _get_image_files(self, folder: Path) -> List[Path]:
        """Mengambil daftar semua file gambar yang valid dalam folder."""
        if not folder.exists():
            logger.warning(f"Folder tidak ditemukan: {folder}")
            return []
        return [f for f in folder.iterdir() if f.is_file() and f.suffix in VALID_IMAGE_EXTENSIONS]

    def _get_positive_pairs(self) -> Dict[Path, Path]:
        """
        Mencari pasangan file gambar & label .txt untuk sampel positif (pest).
        Mendukung folder berstruktur pest/images & pest/labels ATAU pest/ langsung.
        """
        pest_img_dir = self.pest_dir / "images" if (self.pest_dir / "images").exists() else self.pest_dir
        pest_lbl_dir = self.pest_dir / "labels" if (self.pest_dir / "labels").exists() else self.pest_dir

        images = self._get_image_files(pest_img_dir)
        pair_map = {}
        found_labels_count = 0

        for img_path in images:
            # 1. Cari di subfolder labels/ dengan stem yang sama
            txt_path = pest_lbl_dir / f"{img_path.stem}.txt"
            
            # 2. Jika tidak ditemukan, coba cari di direktori yang sama dengan gambar
            if not txt_path.exists():
                txt_path_same = img_path.with_suffix('.txt')
                if txt_path_same.exists():
                    txt_path = txt_path_same

            # 3. Jika label benar-benar ada dan berisi data
            if txt_path.exists() and txt_path.stat().st_size > 0:
                found_labels_count += 1
            else:
                logger.warning(f"Label .txt berukuran 0 / tidak ditemukan untuk {img_path.name}, membuat file label kosong.")
                txt_path.touch(exist_ok=True)

            pair_map[img_path] = txt_path

        logger.info(f"Berhasil menemukan {found_labels_count} label ber-bounding box dari {len(images)} gambar pest.")
        return pair_map

    def _ensure_negative_labels(self) -> Dict[Path, Path]:
        """
        Memastikan setiap gambar no_pest (background/sehat) memiliki file label .txt kosong (0 bytes).
        Mendukung folder no_pest/images ATAU no_pest/ langsung.
        """
        no_pest_img_dir = self.no_pest_dir / "images" if (self.no_pest_dir / "images").exists() else self.no_pest_dir
        images = self._get_image_files(no_pest_img_dir)
        
        pair_map = {}
        for img_path in images:
            txt_path = img_path.with_suffix('.txt')
            if not txt_path.exists():
                txt_path.touch(exist_ok=True)
            pair_map[img_path] = txt_path
        return pair_map

    def prepare_and_split(
        self, 
        train_ratio: float = 0.8, 
        val_ratio: float = 0.1, 
        test_ratio: float = 0.1,
        seed: int = 42
    ) -> Path:
        """
        Membaca dataset dari folder pest & no_pest, melakukan shuffle, 
        dan membaginya ke train, val, test sesuai rasio.
        """
        logger.info("=== 1. MEMULAI PREPROCESSING & DATASET SPLITTING ===")
        
        # 1. Dapatkan Pasangan Gambar & Label
        pest_pairs = self._get_positive_pairs()
        no_pest_pairs = self._ensure_negative_labels()

        logger.info(f"Ditemukan {len(pest_pairs)} sampel berhama (positive) dari: {self.pest_dir}")
        logger.info(f"Ditemukan {len(no_pest_pairs)} sampel sehat (negative) dari: {self.no_pest_dir}")

        if len(pest_pairs) == 0 and len(no_pest_pairs) == 0:
            raise FileNotFoundError("Tidak ada gambar yang ditemukan pada direktori input! Periksa kembali path folder dataset.")

        # Gabungkan semua sampel
        all_pairs = list(pest_pairs.items()) + list(no_pest_pairs.items())

        # 2. ACAK (Shuffle) Dataset dengan seed deterministik
        random.seed(seed)
        random.shuffle(all_pairs)

        total_samples = len(all_pairs)
        n_train = int(total_samples * train_ratio)
        n_val = int(total_samples * val_ratio)
        n_test = total_samples - n_train - n_val

        splits = {
            'train': all_pairs[:n_train],
            'val': all_pairs[n_train:n_train + n_val],
            'test': all_pairs[n_train + n_val:]
        }

        logger.info(f"Pembagian Dataset Total ({total_samples} sampel: {train_ratio*100:.0f}% Train / {val_ratio*100:.0f}% Val / {test_ratio*100:.0f}% Test):")
        logger.info(f" - Train Set : {len(splits['train'])} gambar")
        logger.info(f" - Val Set   : {len(splits['val'])} gambar")
        logger.info(f" - Test Set  : {len(splits['test'])} gambar")

        # 3. Buat Struktur Direktori YOLO Standar
        for split_name in ['train', 'val', 'test']:
            (self.images_dir / split_name).mkdir(parents=True, exist_ok=True)
            (self.labels_dir / split_name).mkdir(parents=True, exist_ok=True)

        # 4. Salin Pasangan Gambar dan Label ke Direktori Output Split
        for split_name, pairs in splits.items():
            img_out_dir = self.images_dir / split_name
            lbl_out_dir = self.labels_dir / split_name

            for img_src, lbl_src in pairs:
                shutil.copy2(img_src, img_out_dir / img_src.name)
                shutil.copy2(lbl_src, lbl_out_dir / lbl_src.name)

        logger.info(f"Dataset berhasil diproses dan disimpan ke: {self.output_dir}")
        return self.output_dir


class YAMLConfigurator:
    """
    Kelas untuk membuat file data.yaml standar YOLOv8.
    """
    @staticmethod
    def create_data_yaml(
        dataset_dir: Path, 
        class_names: List[str], 
        yaml_filename: str = "data.yaml"
    ) -> Path:
        """
        Membuat file data.yaml di root direktori dataset_processed.
        """
        logger.info("=== 2. MEMBUAT FILE KONFIGURASI data.yaml ===")
        yaml_path = dataset_dir / yaml_filename
        
        # Path disesuaikan menggunakan POSIX format untuk kompatibilitas lintas OS
        data_dict = {
            'path': dataset_dir.as_posix(),
            'train': 'images/train',
            'val': 'images/val',
            'test': 'images/test',
            'nc': len(class_names),
            'names': {idx: name for idx, name in enumerate(class_names)}
        }

        with open(yaml_path, 'w', encoding='utf-8') as f:
            yaml.dump(data_dict, f, default_flow_style=False, sort_keys=False)

        logger.info(f"File data.yaml berhasil dibuat di: {yaml_path}")
        logger.info(f"Daftar Kelas ({len(class_names)}): {class_names}")
        return yaml_path


class PestModelTrainer:
    """
    Kelas Pelatihan & Evaluasi Model YOLOv8s.
    """
    def __init__(self, model_name: str = "yolov8s.pt"):
        self.model_name = model_name

    def train_model(
        self,
        data_yaml_path: Path,
        imgsz: int = 1280,
        epochs: int = 100,
        batch: int = 8,
        device: str = "",
        project_dir: Path = Path("runs/pest_detection"),
        experiment_name: str = "yolov8s_pest_exp"
    ):
        """
        Menjalankan proses pelatihan model YOLOv8s dengan hyperparameter augmentasi optimal.
        """
        logger.info("=== 3. MEMULAI TRAINING MODEL YOLOv8s ===")
        try:
            from ultralytics import YOLO
        except ImportError:
            logger.error("Pustaka 'ultralytics' belum terinstall! Silakan jalankan: pip install ultralytics")
            sys.exit(1)

        logger.info(f"Inisialisasi Model Pretrained : {self.model_name}")
        model = YOLO(self.model_name)

        logger.info(f"Parameter Training:")
        logger.info(f" - Image Size : {imgsz}x{imgsz}")
        logger.info(f" - Epochs     : {epochs}")
        logger.info(f" - Batch Size : {batch}")
        logger.info(f" - Device     : {device if device else 'Auto-detect (GPU/CPU)'}")
        logger.info(f" - Data YAML  : {data_yaml_path}")

        # Menjalankan Training dengan Augmentasi On-The-Fly di GPU
        results = model.train(
            data=data_yaml_path.as_posix(),
            imgsz=imgsz,
            epochs=epochs,
            batch=batch,
            device=device if device else None,
            project=project_dir.as_posix(),
            name=experiment_name,
            save=True,
            plots=True,
            exist_ok=True,
            # Augmentasi On-The-Fly GPU (Spesifikasi Proyek BESTARI)
            degrees=20.0,   # Rotasi acak hingga 20 derajat
            scale=0.5,      # Variasi skala / zoom hingga 50%
            fliplr=0.5,     # Flip horizontal (50% probabilitas)
            flipud=0.5,     # Flip vertikal (50% probabilitas)
            mosaic=1.0,     # Mosaic 4-gambar (100% aktif)
            mixup=0.20,     # Mixup blending gambar (20%)
            copy_paste=0.30,# Copy-paste objek hama ke background lain (30%)
            erasing=0.30,   # Random erasing sebagian gambar (30%)
            hsv_h=0.015,    # Variasi Hue warna daun/hama (1.5%)
            hsv_s=0.7,      # Variasi Saturasi pencahayaan matahari (70%)
            hsv_v=0.4       # Variasi Value kecerahan (40%)
        )

        best_model_path = project_dir / experiment_name / "weights" / "best.pt"
        logger.info("=== PELATIHAN MODEL SELESAI ===")
        logger.info(f"Model Terbaik Saved at: {best_model_path}")

        # 4. Menjalankan Evaluasi Otomatis pada Split Test
        self.evaluate_model(best_model_path, data_yaml_path, imgsz, device)

        return best_model_path

    def evaluate_model(self, model_path: Path, data_yaml_path: Path, imgsz: int = 1280, device: str = ""):
        """
        Menjalankan evaluasi performa model terbaik pada folder Test.
        """
        logger.info("=== 4. EVALUASI MODEL PADA TEST DATASET ===")
        from ultralytics import YOLO

        if not model_path.exists():
            logger.error(f"File model {model_path} tidak ditemukan untuk evaluasi.")
            return

        eval_model = YOLO(model_path.as_posix())
        
        # Evaluasi khusus pada data split 'test'
        metrics = eval_model.val(
            data=data_yaml_path.as_posix(),
            split='test',
            imgsz=imgsz,
            device=device if device else None
        )

        logger.info("==================================================")
        logger.info("  METRIK EVALUASI HASIL PELATIHAN (TEST SET)      ")
        logger.info("==================================================")
        logger.info(f" Precision (P)    : {metrics.box.mp:.4f}")
        logger.info(f" Recall (R)       : {metrics.box.mr:.4f}")
        logger.info(f" mAP@50           : {metrics.box.map50:.4f}")
        logger.info(f" mAP@50-95        : {metrics.box.map:.4f}")
        logger.info("==================================================")


def main():
    """
    Fungsi Eksekusi Utama Script (Mendukung CLI / Google Colab / Windows Local)
    """
    import argparse

    parser = argparse.ArgumentParser(
        description="BESTARI - Script Training YOLOv8s Deteksi Hama Tanaman (UXGA ESP32-CAM)"
    )

    # Argumen Path Dataset
    parser.add_argument(
        "--base-dir", type=str, default=r"C:\Majid's\bestari",
        help="Root direktori proyek BESTARI (default: C:\\Majid's\\bestari)"
    )
    parser.add_argument(
        "--pest-dir", type=str, default=None,
        help="Path folder dataset_ori/pest (opsional, jika tidak diset menggunakan base-dir)"
    )
    parser.add_argument(
        "--no-pest-dir", type=str, default=None,
        help="Path folder dataset_ori/no_pest (opsional, jika tidak diset menggunakan base-dir)"
    )
    parser.add_argument(
        "--output-dir", type=str, default=None,
        help="Path folder dataset_processed (opsional, jika tidak diset menggunakan base-dir)"
    )

    # Argumen Hyperparameter Training
    parser.add_argument(
        "--model", type=str, default="yolov8s.pt",
        help="Model YOLOv8 dasar (default: yolov8s.pt)"
    )
    parser.add_argument(
        "--imgsz", type=int, default=1280,
        help="Ukuran resolusi gambar input (default: 1280 untuk UXGA 2MP ESP32-CAM)"
    )
    parser.add_argument(
        "--epochs", type=int, default=100,
        help="Jumlah total epoch training (default: 100)"
    )
    parser.add_argument(
        "--batch", type=int, default=8,
        help="Ukuran batch size (default: 8)"
    )
    parser.add_argument(
        "--device", type=str, default="",
        help="Device GPU/CPU, contoh '0' atau 'cpu' (default: auto detect)"
    )
    parser.add_argument(
        "--classes", nargs="+", default=["ulat_grayak"],
        help="Daftar nama kelas hama sesuai ID Label Studio (default: ulat_grayak)"
    )

    args = parser.parse_args()

    # Resolver Path Lintas OS
    base_dir = Path(args.base_dir)
    pest_dir = Path(args.pest_dir) if args.pest_dir else base_dir / "dataset_ori" / "pest"
    no_pest_dir = Path(args.no_pest_dir) if args.no_pest_dir else base_dir / "dataset_ori" / "no_pest"
    output_dir = Path(args.output_dir) if args.output_dir else base_dir / "dataset_processed"

    logger.info(f"Root Directory Proyek : {base_dir}")
    logger.info(f"Pest Folder (Positive) : {pest_dir}")
    logger.info(f"No Pest (Background)  : {no_pest_dir}")
    logger.info(f"Processed Dataset Dir : {output_dir}")

    # 1. Preprocessing & Dataset Splitting (80% Train, 10% Val, 10% Test)
    pipeline = DatasetPipeline(
        pest_dir=pest_dir,
        no_pest_dir=no_pest_dir,
        output_dir=output_dir
    )
    dataset_path = pipeline.prepare_and_split(train_ratio=0.8, val_ratio=0.1, test_ratio=0.1)

    # 2. Generasi data.yaml
    data_yaml_path = YAMLConfigurator.create_data_yaml(
        dataset_dir=dataset_path,
        class_names=args.classes
    )

    # 3. Training & Evaluasi YOLOv8s
    trainer = PestModelTrainer(model_name=args.model)
    trainer.train_model(
        data_yaml_path=data_yaml_path,
        imgsz=args.imgsz,
        epochs=args.epochs,
        batch=args.batch,
        device=args.device,
        project_dir=base_dir / "runs" / "pest_detection",
        experiment_name="bestari_yolov8s_pest"
    )


if __name__ == "__main__":
    main()

