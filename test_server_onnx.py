"""
===============================================================================
  BESTARI - AI Cloud Server Endpoint Tester (Simulasi ESP32-CAM)
===============================================================================
  Deskripsi: Script ini mengirimkan foto dari folder dataset ke server Cloud
             PythonAnywhere untuk mensimulasikan tangkapan kamera ESP32-CAM
             dan menampilkan hasil deteksi JSON serta perintah relay sprayer.
===============================================================================
"""

import os
import requests
from pathlib import Path

# URL Server Cloud PythonAnywhere Anda
SERVER_URL = "https://halimadi.pythonanywhere.com/detect"

def test_detect_image():
    # Cari sampel gambar dari dataset validasi
    dataset_dir = Path("dataset/valid/images")
    image_file = None

    if dataset_dir.exists():
        images = list(dataset_dir.glob("*.jpg")) + list(dataset_dir.glob("*.png"))
        if images:
            image_file = images[0]

    if not image_file or not image_file.exists():
        print("[ERR] Tidak menemukan sampel gambar di dataset/valid/images.")
        print("Silakan tentukan path gambar manual.")
        return

    print(f" Mengirim gambar sampel: {image_file.name} ke server AI Cloud...")
    print(f" Target Endpoint: {SERVER_URL}\n")

    try:
        with open(image_file, "rb") as f:
            files = {"image": (image_file.name, f, "image/jpeg")}
            response = requests.post(SERVER_URL, files=files, timeout=30)

        if response.status_code == 200:
            data = response.json()
            print("==================================================")
            print(" RESPONS DETEKSI AI BESTARI (SUCCESS 200 OK)")
            print("==================================================")
            print(f" Status Tanaman      : {data.get('plant_status').upper()}")
            print(f" Terdeteksi Hama     : {data.get('threat_detected')}")
            print(f" Jumlah Ulat Grayak  : {data.get('ulat_grayak_count')} ekor")
            print(f" Perintah Relay      : {data.get('relay_action')}")
            print(f" Waktu Inference AI  : {data.get('inference_time_ms')} ms")
            print(f" Total Bounding Box  : {data.get('total_detections')}")
            print("--------------------------------------------------")
            print(" Detail Bounding Box (Kordinat & Confidence):")
            for idx, det in enumerate(data.get("detections", []), 1):
                print(f"   [{idx}] {det['class_name']} (Conf: {det['confidence']*100:.1f}%) -> BBox: {det['bbox']}")
            print("==================================================")
        else:
            print(f"[ERR] Server merespon HTTP {response.status_code}: {response.text}")

    except Exception as e:
        print(f"[ERR] Gagal terhubung ke server: {e}")

if __name__ == "__main__":
    test_detect_image()
