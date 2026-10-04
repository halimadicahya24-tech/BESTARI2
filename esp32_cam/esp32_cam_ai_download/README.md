# 🌿 BESTARI - ESP32-CAM AI Detector & Auto-Labeler Downloader

Firmware ini dibuat khusus untuk menguji dan menangkap foto beresolusi tinggi langsung dari ESP32-CAM, menghubungkannya ke **Server AI YOLOv8** (PythonAnywhere / Local Flask), dan menampilkan **Bounding Box (Kotak Hijau) & Label Nama Hama** secara langsung di web dashboard ESP32-CAM!

---

## 📌 Fitur Utama

1. **AI Auto-Labeling Real-Time:**
   - Menangkap foto dari ESP32-CAM (`UXGA 1600x1200` / `SXGA` / `VGA`).
   - Mengirim foto via HTTP POST ke Server AI (`https://halimadi.pythonanywhere.com/detect` atau `http://localhost:5000/detect`).
   - Melukis kotak batas hijau (`#00FF00`) dan label (misal: `🔍 Ulat Grayak 91%`) secara otomatis di atas preview foto.
2. **💾 Download Foto Berlabel (`.jpg`):**
   - Menariknya, saat mengeklik tombol **💾 Download Foto Berlabel (.jpg)**, sistem akan menggambar kotak hijau dan teks label langsung ke atas kanvas gambar JPEG, sehingga foto yang tersimpan di komputer Anda **sudah tercetak dengan label hama YOLOv8**!
3. **Fleksibilitas URL Server AI:**
   - Terdapat input field di Web Dashboard untuk mengubah Endpoint Server AI secara mudah (Cloud vs Local Server).
4. **Diagnostik Wi-Fi & Pasokan Daya:**
   - Memiliki fitur scan Wi-Fi dan detektor brownout bawaan.

---

## 📁 Lokasi File Arduino Sketch

- Folder: `esp32_cam/esp32_cam_ai_download/`
- File: `esp32_cam_ai_download.ino`

---

## 🚀 Cara Upload & Menggunakan

1. Buka Arduino IDE dan buka file `esp32_cam_ai_download.ino`.
2. Sesuaikan `WIFI_SSID` dan `WIFI_PASSWORD` dengan Hotspot / Wi-Fi Anda.
3. Hubungkan `GPIO 0` ke `GND` pada modul ESP32-CAM.
4. Klik **Upload** di Arduino IDE.
5. Setelah *Done Uploading*, **lepaskan jumper GPIO 0 dari GND**, lalu tekan tombol **RESET** pada board.
6. Buka Serial Monitor (115200 baud) dan dapatkan IP Address ESP32-CAM (misal: `http://192.168.137.3`).
7. Buka IP tersebut di Browser Laptop/HP.
8. Klik tombol **🔍 Ambil & Deteksi AI (Auto-Label)** untuk menguji deteksi hama!
