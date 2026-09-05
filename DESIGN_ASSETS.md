# Asset Desain Antarmuka Aplikasi BESTARI (Samsung Solve for Tomorrow 2026)

Berikut adalah gambar desain antarmuka (*User Interface Mockup*) untuk setiap halaman utama aplikasi BESTARI yang telah disesuaikan (mode monitoring otomatis tanpa manual pump dan tanpa metrik kelembaban). Anda dapat langsung mengunduh/menyalin gambar-gambar ini untuk dilampirkan pada dokumen proposal.

---

## Carousel Tampilan Aplikasi

````carousel
![BESTARI Home Dashboard UI Mockup](C:\Users\FAJRIN AL MAJID\.gemini\antigravity-ide\brain\d09ddb9d-91a3-4d67-a42c-6ba05580ee0d\bestari_dashboard_mockup_1785330260008.png)
<!-- slide -->
![BESTARI History and Analytics UI Mockup](C:\Users\FAJRIN AL MAJID\.gemini\antigravity-ide\brain\d09ddb9d-91a3-4d67-a42c-6ba05580ee0d\bestari_history_mockup_1785330276114.png)
<!-- slide -->
![BESTARI System Settings UI Mockup](C:\Users\FAJRIN AL MAJID\.gemini\antigravity-ide\brain\d09ddb9d-91a3-4d67-a42c-6ba05580ee0d\bestari_settings_mockup_1785330296717.png)
````

---

## Deskripsi Halaman Untuk Lampiran Proposal

### 1. Halaman Utama (Home Dashboard)
- **Tangkapan Kamera Real-Time (ESP32-CAM)**: Menampilkan deteksi hama ulat grayak menggunakan kotak AI YOLOv8.
- **Kartu Indikator Kondisi Tanaman**: Status kondisi tanaman (*Safe/Warning*) dan deteksi ancaman hama.
- **Tingkat Sisa Biopestisida**: Progress bar monitoring kapasitas biopestisida *Beauveria bassiana* (Kapasitas 5L).
- **Status Monitoring Sistem**: Menampilkan mode sistem otomatis (`AUTO ON`) terhubung ke GPIO 14 Relay.
- **Metrik Lingkungan**: Informasi suhu lingkungan (`TEMP`) dan identifikasi node aktif (`NODE`).

### 2. Halaman Histori & Analitik (History & Analytics)
- **Visual Logs Carousel**: Galeri foto tangkapan layar inspeksi visual beserta tanggal dan waktu.
- **Matriks Status Kesehatan Tanaman (Plant Status History)**: Matriks kesehatan tanaman dengan baris Kamera (`Cam 1`, `Cam 2`, `Cam 3`) dan kolom Waktu (`06:00`, `12:00`, `18:00`, `00:00`).
- **Grafik Tren Frekuensi Deteksi Hama (Pest Detections Line Chart)**: Line chart dengan sumbu-Y (Jumlah Hama / Ekor) dan sumbu-X (Waktu Pengamatan / WIB) disertai highlight titik puncak deteksi.

### 3. Halaman Pengaturan (System & Hardware Settings)
- **Pemetaan Pinout Hardware**: Informasi pinout ESP32-CAM (GPIO 14 Relay untuk mini pump & dinamo agitator).
- **Backend API Config**: Status koneksi server Flask AI YOLOv8.
- **Parameter Kontrol & Otomatisasi**: Pengaturan durasi pulse penyemprotan otomatis, pre-spray agitator dinamo, dan ambang batas AI confidence threshold.
- **Kredit Tim BESTARI**: Profil Ketua Tim Fajrin Al Majid dan anggota tim SMAN Sumatera Selatan pada ajang Samsung Solve for Tomorrow.
