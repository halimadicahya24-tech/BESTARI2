# 📸 Panduan ESP32-CAM Photo Capture & Downloader (BESTARI)

Sketsa ini dirancang khusus agar Anda dapat mengambil foto beresolusi tinggi (UXGA 1600x1200 - 2MP) dari modul ESP32-CAM (OV2640) dan mendownload file `.jpg` langsung ke Laptop Anda untuk analisis kualitas sampel daun dan hama secara lebih detail.

---

## 📌 Fitur Utama Sketsa

1. Web Dashboard Dashboard Onboard: Akses langsung melalui IP ESP32-CAM di browser Laptop (misal: `http://192.168.1.15`).
2. Pilihan Resolusi Foto:
   - UXGA (1600x1200): Resolusi 2 Megapixel (Sangat detail untuk analisis daun & hama).
   - SXGA (1280x1024) / XGA (1024x768) / SVGA (800x600) / VGA (640x480).
3. Pengaturan Kualitas JPEG: Quality 10 (Jernih & Detail Maksimal).
4. Kontrol Senter Flash LED Onboard (GPIO 4): Dapat dinyalakan/dimatikan melalui Web UI saat mengambil foto di kondisi gelap/jarak dekat (macro).
5. Tombol 1-Click Download (.jpg): Mengunduh file foto secara otomatis langsung ke folder `Downloads` Laptop Anda.

---

## 📂 Lokasi Kode File

File sketsa Arduino tersimpan di:
- [`esp32_cam/esp32_cam_capture_download/esp32_cam_capture_download.ino`](./esp32_cam_capture_download/esp32_cam_capture_download.ino)

---

## 🚀 Langkah-Langkah Menggunakan

### Step 1: Atur SSID & Password Wi-Fi
Buka file [`esp32_cam_capture_download.ino`](./esp32_cam_capture_download/esp32_cam_capture_download.ino), lalu sesuaikan baris 17-18 dengan Wi-Fi / Hotspot HP yang terhubung ke Laptop Anda:
```cpp
const char WIFI_SSID     = "NAMA_WIFI_ANDA";     
const char WIFI_PASSWORD = "PASSWORD_WIFI_ANDA"; 
```

### Step 2: Upload Kode ke ESP32-CAM
1. Pasang ESP32-CAM ke modul FTDI / FT232RL Programmer atau ESP32-CAM MB Shield / FTDI USB Adapter.
2. Di Arduino IDE:
   - Pilih Board: AI Thinker ESP32-CAM
   - PSRAM: Enabled
   - Upload Speed: 115200 atau 921600
3. Tekan tombol Upload. (Jika menggunakan FTDI biasa, hubungkan GPIO 0 ke GND sebelum upload, lalu lepas kabel GPIO 0 setelah upload selesai dan tekan tombol Reset).

### Step 3: Dapatkan IP Address ESP32-CAM
Buka Serial Monitor (115200 baud) di Arduino IDE, tekan tombol Reset pada ESP32-CAM. Anda akan melihat log seperti berikut:

```text
========================================================
  🌿 BESTARI - ESP32-CAM High-Res Photo Downloader
========================================================
[WIFI] Menghubungkan ke mjid... Terhubung!

--------------------------------------------------------
  🌐 BUKA URL INI DI BROWSER LAPTOP ANDA:
  👉 http://192.168.1.15
--------------------------------------------------------
```

### Step 4: Buka Web UI di Laptop & Download Foto
1. Pastikan Laptop Anda terhubung ke jaringan Wi-Fi / Hotspot yang sama.
2. Buka browser Laptop (Chrome/Edge/Firefox), lalu ketik alamat IP yang muncul di Serial Monitor (contoh: `http://192.168.1.15`).
3. Pilih Resolusi: Pilih `UXGA (1600x1200)` untuk detail maksimal.
4. (Opsional) Tekan tombol 💡 Senter Flash: ON jika butuh pencahayaan tambahan.
5. Klik 📸 Ambil Foto (Take Photo).
6. Setelah foto muncul, klik tombol hijau 💾 Download Foto (.jpg). File foto `.jpg` akan langsung tersimpan di Laptop Anda!

---

## 🔗 Direct URL Endpoints (Opsional)

Anda juga bisa langsung mengakses URL berikut di browser:
- `http://<IP-ESP32-CAM>/capture` : Melihat preview foto tunggal.
- `http://<IP-ESP32-CAM>/download` : Memaksa browser langsung mendownload file `.jpg`.
- `http://<IP-ESP32-CAM>/stream` : Streaming video live MJPEG.
