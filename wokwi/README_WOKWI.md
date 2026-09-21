# 🚀 Panduan Simulasi Wokwi - BESTARI IoT Controller (Opsi A)

Simulasi ini dibuat berdasarkan konversi presisi dari **Cirkit Designer Wiring Netlist** ke simulator **Wokwi** menggunakan target board **ESP32 (30-Pin DevKit)**.

---

## 📌 Pemetaan Komponen di Wokwi

| Komponen Nyata | Komponen Wokwi | Pin ESP32 (30-Pin) | Keterangan |
| :--- | :--- | :---: | :--- |
| **Pompa Semprot Biopestisida** | Relay 1 + LED Biru | **GPIO 4 (D4)** | Menyemprot larutan biopestisida saat ada hama |
| **Pompa Siram Air Tanah** | Relay 2 + LED Cyan | **GPIO 19 (D19)** | Menyiram tanah netral saat tanah kering |
| **Dinamo Motor Pengaduk** | Relay 3 + LED Kuning | **GPIO 23 (D23)** | Mengaduk racikan biopestisida selama 4 detik |
| **Servo Motor** | Servo SG90 | **GPIO 18 (D18)** | Bergerak 90° saat pengadukan, 0° standby |
| **Ultrasonik 1 (Atas)** | HC-SR04 | **TRIG: D27, ECHO: D33** | Mengukur ketinggian level tangki biopestisida |
| **Ultrasonik 2 (Bawah)** | HC-SR04 | **TRIG: D25, ECHO: D26** | Mengukur ketinggian level tangki air bersih |
| **Sensor Kelembaban Tanah** | Potensiometer 10k | **SIG: D34 (A0)** | Putar potensiometer untuk simulasi tanah basah / kering |

---

## 🎮 Cara Menjalankan di Wokwi Web (wokwi.com)

1. Buka [https://wokwi.com/projects/new/esp32](https://wokwi.com/projects/new/esp32).
2. Di tab **`diagram.json`**, salin dan tempel seluruh isi file [`wokwi/diagram.json`](./diagram.json).
3. Di tab kode sketch (`sketch.ino`), salin dan tempel seluruh isi kode dari [`esp32_cam/esp32_cam_bestari/esp32_cam_bestari.ino`](../esp32_cam/esp32_cam_bestari/esp32_cam_bestari.ino).
4. Di tab **`libraries.txt`**, tambahkan:
   ```text
   ArduinoJson
   ESP32Servo
   ```
5. Tekan tombol **Play (Hijau)** untuk memulai simulasi!
6. Buka **Serial Monitor** (115200 baud) untuk melihat telemetri real-time:
   * Putar slider **Potensiometer** ke arah kanan (tegangan > 2500 ADC) untuk melihat mode penyiraman air otomatis aktif!
   * Ubah jarak pada **Ultrasonik 1 & 2** untuk melihat telemetri level cairan.
