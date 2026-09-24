# 🚀 Panduan Simulasi Wokwi - BESTARI ESP32 Main Controller

Simulasi ini menggunakan target board ESP32 (30-Pin DevKit) sebagai Main Controller Board pada arsitektur Dual-ESP32 BESTARI.

---

## 📌 Pemetaan Komponen di Wokwi

| Komponen Nyata | Komponen Wokwi | Pin ESP32 (30-Pin) | Keterangan |
| :--- | :--- | :---: | :--- |
| Dinamo Motor Pengaduk | Relay 1 + LED Gold | GPIO 23 (D23) | Mengaduk racikan biopestisida di tangki selama 3 detik |
| Pompa Semprot Biopestisida | Relay 2 + LED Biru | GPIO 4 (D4) | Mengalirkan biopestisida via selang biopestisida ke 1 Nozzle |
| Pompa Siram Air Bersih | Relay 3 + LED Cyan | GPIO 19 (D19) | Mengalirkan air bersih via selang air ke 1 Nozzle |
| 1 Dual-Input Spray Nozzle | Muara Output Nozzle | (Output Nozzle) | Menerima semprotan biopestisida maupun siraman air |
| Ultrasonik 1 (Tangki Biopestisida) | HC-SR04 | TRIG: D27, ECHO: D33 | Ketinggian level tangki biopestisida |
| Ultrasonik 2 (Tangki Air) | HC-SR04 | TRIG: D25, ECHO: D26 | Ketinggian level tangki air bersih |
| Sensor Kelembaban Tanah | Potensiometer 10k | SIG: D34 (A0) | Reading kelembaban tanah (ADC1_CH6 - Safe with Wi-Fi) |

---

## 🎮 Cara Menjalankan di Wokwi Web (wokwi.com)

1. Buka [https://wokwi.com/projects/new/esp32](https://wokwi.com/projects/new/esp32).
2. Di tab `diagram.json`, salin dan tempel isi [`wokwi/diagram.json`](./diagram.json).
3. Di tab kode sketch (`sketch.ino`), salin dan tempel isi dari [`esp32_main_controller/esp32_main_controller.ino`](../esp32_main_controller/esp32_main_controller.ino).
4. Di tab `libraries.txt`, tambahkan:
   ```text
   ArduinoJson
   ```
5. Tekan tombol Play (Hijau) untuk memulai simulasi!
6. Buka Serial Monitor (115200 baud) untuk melihat telemetri real-time:
   - Putar slider Potensiometer untuk mengatur kelembaban tanah.
   - Ubah jarak pada Ultrasonik 1 & 2 untuk menguji telemetri level tangki.
