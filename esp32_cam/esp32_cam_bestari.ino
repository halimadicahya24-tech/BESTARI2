/*
  ===============================================================================
    BESTARI (Samsung Solve for Tomorrow 2026) - ESP32-CAM Firmware
    Sistem Otomatis Deteksi Hama Ulat Grayak, Pengaduk & Penyemprot Biopestisida
  ===============================================================================
    Penulis     : Fajrin Al Majid & Tim BESTARI SMAN Sumatera Selatan
    Board       : AI Thinker ESP32-CAM (OV2640)
    Fungsi      : 
      1. Mengambil foto tanaman jarak 50cm secara otomatis.
      2. Mengirim foto via HTTP POST ke Server Flask AI YOLO (server_yolo.py).
      3. Menerima tanggapan JSON hasil analisis AI dari server.
      4. Jika terdeteksi ulat grayak:
         a. Menyalakan Dinamo Pengaduk Biopestisida (Mixer Motor).
         b. Menyalakan Pompa Semprot Biopestisida (Spray Pump).
  ===============================================================================
*/

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===============================================================================
// 1. KONFIGURASI WIFI & SERVER FLASK AI
// ===============================================================================
const char* WIFI_SSID     = "NAMA_WIFI_ANDA";       // Ganti dengan nama Wi-Fi Anda
const char* WIFI_PASSWORD = "PASSWORD_WIFI_ANDA";   // Ganti dengan password Wi-Fi Anda

// Alamat IP Komputer/Server tempat Flask server_yolo.py berjalan
// Contoh: "http://192.168.1.50:5000/detect"
const char* SERVER_URL    = "http://192.168.1.50:5000/detect";

// Interval pengambil foto & pengujian (dalam milidetik) -> Contoh: 30 detik
const unsigned long CAPTURE_INTERVAL_MS = 30000;

// Durasi pengadukan biopestisida (Mixer Motor) dalam milidetik -> Contoh: 4 detik
const unsigned long MIXING_DURATION_MS  = 4000;

// Durasi penyemprotan biopestisida (Spray Pump) dalam milidetik -> Contoh: 5 detik
const unsigned long SPRAY_DURATION_MS   = 5000;

// ===============================================================================
// 2. KONFIGURASI RELAY & PINOUT ESP32-CAM
// ===============================================================================
// Logika Modul Relay (Sebagian besar relay 2-channel di pasaran adalah Active LOW)
#define RELAY_ON  LOW   // LOW untuk menyalakan relay
#define RELAY_OFF HIGH  // HIGH untuk mematikan relay

// Pin Relay Actuator BESTARI
#define MIXER_RELAY_PIN  14 // GPIO 14: Relay Dinamo Pengaduk Biopestisida
#define PUMP_RELAY_PIN   13 // GPIO 13: Relay Pompa Semprot Biopestisida
#define FLASH_LED_PIN     4 // GPIO 4 : Flash LED Kamera (Opsional saat gelap)

// ===============================================================================
// 3. PINOUT ESP32-CAM MODEL AI-THINKER (OV2640)
// ===============================================================================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

unsigned long lastCaptureTime = 0;

// ===============================================================================
// FUNGSI INTI ESP32-CAM
// ===============================================================================

// Inisialisasi Hardware Kamera OV2640
bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_siod     = SIOD_GPIO_NUM;
  config.pin_sioc     = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  // Cek Keberadaan PSRAM (Ekstra RAM)
  if (psramFound()) {
    config.frame_size = FRAMESIZE_VGA; // Resolusi 640x480 (Ideal untuk jarak 50cm & YOLO)
    config.jpeg_quality = 10;          // Kualitas gambar (0-63, semakin rendah semakin bagus)
    config.fb_count = 2;
    Serial.println("[BESTARI CAM] PSRAM Terdeteksi! Menggunakan resolusi VGA (640x480).");
  } else {
    config.frame_size = FRAMESIZE_CIF; // Resolusi 400x296 jika tanpa PSRAM
    config.jpeg_quality = 12;
    config.fb_count = 1;
    Serial.println("[BESTARI CAM] PSRAM Tidak Ditemukan. Menggunakan resolusi CIF.");
  }

  // Inisialisasi Driver Kamera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[BESTARI CAM ERROR] Gagal inisialisasi kamera! Error: 0x%x\n", err);
    return false;
  }

  // Atur orientasi gambar jika perlu
  sensor_t * s = esp_camera_sensor_get();
  s->set_vflip(s, 1);   // Flip vertikal jika kamera terbalik
  s->set_hmirror(s, 0); // Mirror horizontal

  Serial.println("[BESTARI CAM] Kamera OV2640 Berhasil Diinisialisasi!");
  return true;
}

// Inisialisasi Koneksi Wi-Fi
void connectWiFi() {
  Serial.print("[BESTARI NETWORK] Menghubungkan ke Wi-Fi ");
  Serial.print(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 20) {
    delay(500);
    Serial.print(".");
    attempt++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[BESTARI NETWORK] Wi-Fi Terhubung!");
    Serial.print("[BESTARI NETWORK] IP ESP32-CAM: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[BESTARI NETWORK ERROR] Gagal terhubung ke Wi-Fi. Memunculkan percobaan ulang...");
  }
}

// Eksekusi Penyemprotan & Pengadukan Biopestisida Otomatis
void executeBiopesticideAction(int ulatCount) {
  Serial.println("=========================================================");
  Serial.printf("⚠️ ANCAMAN HAMA DETEKSI! Ditemukan %d Ulat Grayak/Kerusakan!\n", ulatCount);
  Serial.println("=========================================================");

  // --- LOKASI TAHAP 1: PENGADUKAN BIOPESTISIDA ---
  Serial.println("[ACTUATOR STEP 1] Menyalakan Dinamo Pengaduk Biopestisida (Mixer)...");
  digitalWrite(MIXER_RELAY_PIN, RELAY_ON);
  delay(MIXING_DURATION_MS); // Biarkan dinamo mengaduk larutan biopestisida agar homogen

  // --- LOKASI TAHAP 2: PENYEMPROTAN BIOPESTISIDA ---
  Serial.println("[ACTUATOR STEP 2] Menyalakan Pompa Semprot Biopestisida (Spray Pump)...");
  digitalWrite(PUMP_RELAY_PIN, RELAY_ON);
  delay(SPRAY_DURATION_MS);  // Proses penyemprotan target tanaman

  // --- LOKASI TAHAP 3: PEMATIAN SELURUH AKTUATOR ---
  Serial.println("[ACTUATOR STEP 3] Penyemprotan Selesai. Mematikan Pompa & Pengaduk...");
  digitalWrite(PUMP_RELAY_PIN, RELAY_OFF);
  delay(500);
  digitalWrite(MIXER_RELAY_PIN, RELAY_OFF);

  Serial.println("[BESTARI ACTUATOR] Eksekusi Biopestisida Selesai. Sistem kembali ke mode pengawasan.\n");
}

// Mengambil foto dan mengirimkan ke Server Flask AI via HTTP POST
void captureAndSendImage() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[BESTARI CAM] Wi-Fi terputus. Mencoba reconnect...");
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) return;
  }

  // 1. Ambil Frame Buffer dari Kamera
  Serial.println("\n[BESTARI CAM] Menangkap foto tanaman dari jarak 50cm...");
  
  // Opsional: Nyalakan Flash LED sejenak jika pencahayaan kurang
  // digitalWrite(FLASH_LED_PIN, HIGH);
  // delay(100);

  camera_fb_t * fb = esp_camera_fb_get();
  
  // digitalWrite(FLASH_LED_PIN, LOW); // Matikan Flash LED

  if (!fb) {
    Serial.println("[BESTARI CAM ERROR] Gagal menangkap gambar dari kamera OV2640!");
    return;
  }

  Serial.printf("[BESTARI CAM] Foto berhasil ditangkap! Ukuran data: %u byte.\n", fb->len);

  // 2. Buat Koneksi HTTP POST Multipart ke Server Flask
  HTTPClient http;
  http.begin(SERVER_URL);
  
  // Buat boundary unik untuk multipart/form-data
  String boundary = "----BESTARIBoundaryESP32CAM";
  String contentType = "multipart/form-data; boundary=" + boundary;
  http.addHeader("Content-Type", contentType);

  // Header dan Footer Form Multipart
  String head = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"image\"; filename=\"capture.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
  String tail = "\r\n--" + boundary + "--\r\n";

  uint32_t totalLen = head.length() + fb->len + tail.length();

  Serial.println("[BESTARI NETWORK] Mengirim gambar ke Server AI Flask (" + String(SERVER_URL) + ")...");
  
  // Kirim data buffer
  int httpResponseCode = http.POST((uint8_t*)head.c_str(), head.length());
  
  // Jika HTTP Client mendukung streaming payload besar
  WiFiClient* stream = http.getStreamPtr();
  if (httpResponseCode > 0 || stream != NULL) {
    stream->write(fb->buf, fb->len);
    stream->write((uint8_t*)tail.c_str(), tail.length());
  }

  // 3. Kembalikan Frame Buffer Kamera ke Memory
  esp_camera_fb_return(fb);

  // 4. Baca Respons JSON dari Server Flask AI
  int responseCode = http.POST((uint8_t*)head.c_str(), 0); // Ambil status code
  String responsePayload = http.getString();
  http.end();

  Serial.printf("[BESTARI SERVER] HTTP Response Code: %d\n", responseCode);
  Serial.println("[BESTARI SERVER] Response JSON: " + responsePayload);

  // 5. Parsing Hasil Deteksi JSON Menggunakan ArduinoJson
  if (responseCode == 200 && responsePayload.length() > 0) {
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, responsePayload);

    if (!error) {
      bool threatDetected = doc["threat_detected"] | false;
      int ulatCount = doc["ulat_grayak_count"] | 0;
      const char* relayAction = doc["relay_action"] | "IDLE";
      const char* plantStatus = doc["plant_status"] | "safe";

      Serial.printf("[ANALISIS AI] Status Tanaman: %s | Ulat Grayak: %d | Aksi: %s\n", 
                    plantStatus, ulatCount, relayAction);

      // Eksekusi jika AI menginstruksikan TRIGGER_SPRAY atau terdeteksi ulat
      if (threatDetected || String(relayAction) == "TRIGGER_SPRAY") {
        executeBiopesticideAction(ulatCount);
      } else {
        Serial.println("[BESTARI SYSTEM] Tanaman Sehat & Aman. Tidak ada aksi penyemprotan.\n");
      }
    } else {
      Serial.print("[JSON ERROR] Gagal parsing JSON dari server: ");
      Serial.println(error.c_str());
    }
  } else {
    Serial.println("[BESTARI SERVER ERROR] Respon dari server tidak valid atau gagal!");
  }
}

// ===============================================================================
// SETUP & MAIN LOOP
// ===============================================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n=========================================================");
  Serial.println("  BESTARI - ESP32-CAM AI Pest Monitoring & Spray System  ");
  Serial.println("  Projek Samsung Solve for Tomorrow 2026                ");
  Serial.println("=========================================================");

  // Inisialisasi Output Pin Relay & LED
  pinMode(MIXER_RELAY_PIN, OUTPUT);
  pinMode(PUMP_RELAY_PIN, OUTPUT);
  pinMode(FLASH_LED_PIN, OUTPUT);

  // Pastikan Relay dalam keadaan MATI saat booting
  digitalWrite(MIXER_RELAY_PIN, RELAY_OFF);
  digitalWrite(PUMP_RELAY_PIN, RELAY_OFF);
  digitalWrite(FLASH_LED_PIN, LOW);

  // Initialisasi Kamera OV2640
  if (!initCamera()) {
    Serial.println("[CRITICAL ERROR] Kamera gagal diinisialisasi! Sistem dihentikan.");
    while (true) { delay(1000); }
  }

  // Koneksi Wi-Fi
  connectWiFi();
}

void loop() {
  unsigned long currentMillis = millis();

  // Jalankan siklus deteksi foto setiap CAPTURE_INTERVAL_MS
  if (currentMillis - lastCaptureTime >= CAPTURE_INTERVAL_MS) {
    lastCaptureTime = currentMillis;
    captureAndSendImage();
  }
}
