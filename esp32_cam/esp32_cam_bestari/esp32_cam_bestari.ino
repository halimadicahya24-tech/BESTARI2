/*
  ===============================================================================
    BESTARI - ESP32-CAM Main Board Firmware (Automated Agricultural System)
    Konfigurasi Pinout Bebas Konflik Sesuai Pin Fisik AI-Thinker Header
  ===============================================================================
    Proyek      : BESTARI (Samsung Solve for Tomorrow 2026)
    Target Board: ESP32-CAM (AI-Thinker OV2640 Module)
    Deskripsi   : ESP32-CAM difungsikan sebagai Main Controller utama & AI Camera.
                  Mengontrol Relay Dual-Channel (Dinamo Pengaduk & Pompa Air),
                  Sensor Kelembaban Tanah (A0 di GPIO 13 ADC2 dengan Wi-Fi Pause),
                  2x Sensor Ultrasonik (GPIO 16 & GPIO 3) dengan TRIG Tergabung (GPIO 12),
                  serta Pengiriman Foto AI ke Server.
  ===============================================================================
    PINOUT MAPPING ESP32-CAM (RESOLVED PHYSICAL HEADER ONLY):
    -----------------------------------------------------------------------------
    1. Modul Relay Dual-Channel (Active LOW - TETAP):
       - IN1 -> GPIO 14 (Dinamo Pengaduk Biopestisida)
       - IN2 -> GPIO 15 (Pompa Semprot / Air Tanah)

    2. Sensor Ultrasonik (HC-SR04 Dual Tank Level):
       - Combined TRIG -> GPIO 12 (TETAP: Pin TRIG Ultrasonik 1 & 2 Digabung)
       - ECHO 1        -> GPIO 16 (Dipindah dari GPIO 2 agar GPIO 2 murni PCLK Kamera)
       - ECHO 2        -> GPIO 3  (Dipindah dari GPIO 4 agar GPIO 4 murni Flash LED Kamera)

    3. Sensor Kelembaban Tanah (Soil Moisture Resistive/Capacitive):
       - Analog AO     -> GPIO 13 (TETAP di GPIO 13! Menggunakan trik esp_wifi_stop/start saat membaca ADC)

    4. Modul Kamera & Flash LED (OV2640 Internal ESP32-CAM - TETAP):
       - PCLK      -> GPIO 2  (TETAP: Khusus Hardware Pixel Clock Kamera)
       - Flash LED -> GPIO 4  (TETAP: Khusus Lampu Kilat Kamera)
       - Terhubung internal ke GPIO 32, 0, 26, 27, 35, 34, 39, 36, 21, 19, 18, 5, 25, 23.

    5. Catatan PENTING Pengaturan IDE Arduino:
       - Board        : "AI Thinker ESP32-CAM"
       - PSRAM        : "Disabled" (Wajib disabled karena GPIO 16 dipakai ECHO1)
       - Flash Mode   : "QIO" atau "DIO"
  ===============================================================================
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <esp_wifi.h>
#include <ArduinoJson.h>
#include "esp_camera.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// Enable/Disable Fitur Kamera AI
#define ENABLE_CAMERA true

// ===============================================================================
// 1. DEFINISI PIN CAMERA OV2640 (AI-THINKER MODEL)
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
#define PCLK_GPIO_NUM      2

// ===============================================================================
// 2. KONFIGURASI WI-FI & SERVER FLASK AI PYTHONANYWHERE
// ===============================================================================
const char* WIFI_SSID     = "mjid";                      // SSID Wi-Fi Anda
const char* WIFI_PASSWORD = "8765432111";                // Password Wi-Fi Anda

// Host SSL & Endpoint Server PythonAnywhere
const char* SERVER_HOST   = "halimadi.pythonanywhere.com";
const int   SERVER_PORT   = 443;                         // Port HTTPS
const char* STATUS_PATH   = "/status/latest";            // Endpoint telemetri & status hama
const char* DETECT_PATH   = "/detect";                   // Endpoint upload gambar deteksi AI
const char* TELEMETRY_PATH= "/telemetry";                // Endpoint update telemetri sensor & tank volume

// Interval Pengujian (ms)
const unsigned long POLL_INTERVAL_MS = 10000;            // Polling server tiap 10 detik

// Durasi Aktuator
const unsigned long MIXING_DURATION_MS    = 4000;        // Pengadukan biopestisida (4 detik)
const unsigned long SPRAY_BIOPESTICIDE_MS = 5000;        // Penyemprotan biopestisida (5 detik)
const unsigned long WATERING_SOIL_MS       = 4000;        // Penyiraman air tanah (4 detik)

// Ambang Batas Sensor Kelembaban Tanah (ADC 12-bit: 0 - 4095)
const int SOIL_DRY_THRESHOLD = 2500;

// ===============================================================================
// DIMENSI GEOMETRI TABUNG TANGKI (PRESISI MATEMATIS)
// ===============================================================================
const float TANK_HEIGHT_CM   = 14.5f; // Tinggi fisik tabung penyimpanan (14.5 cm)
const float TANK_DIAMETER_CM = 8.5f;  // Diameter tabung (8.5 cm)
const float TANK_RADIUS_CM   = TANK_DIAMETER_CM / 2.0f; // Radius r = 4.25 cm

// Volume Total Silinder V = pi * r^2 * h (~822.47 cm^3 / mL)
const float TANK_TOTAL_VOL_ML = 3.14159265f * TANK_RADIUS_CM * TANK_RADIUS_CM * TANK_HEIGHT_CM;

// ===============================================================================
// 3. DEFINISI PINOUT ESP32-CAM MAIN BOARD (PIN FISIK HEADER AI-THINKER)
// ===============================================================================

// Modul Relay Dual-Channel (Active LOW) - TETAP
#define RELAY_MIXER_PIN  14  // IN1 -> Dinamo Pengaduk Biopestisida (TETAP)
#define RELAY_PUMP_PIN   15  // IN2 -> Pompa Semprot / Air Tanah (TETAP)

#define RELAY_ON   LOW
#define RELAY_OFF  HIGH

// Sensor Ultrasonik (Combined TRIG Pin)
#define US_TRIG_PIN      12  // Shared TRIG pin untuk Ultrasonik 1 & 2 (TETAP)
#define US1_ECHO_PIN     16  // ECHO Ultrasonik 1 (Tangki Biopestisida - Pin Header GPIO 16)
#define US2_ECHO_PIN      3  // ECHO Ultrasonik 2 (Tangki Air Bersih - Pin Header GPIO 3/U0RXD)

// Sensor Kelembaban Tanah
#define SOIL_SENSOR_PIN  13  // Analog A0 (GPIO 13 / ADC2_CH4 dengan Trik Wi-Fi Pause)

unsigned long lastPollTime = 0;
bool isCameraInitialized   = false;

// ===============================================================================
// FUNGSI PERHITUNGAN GEOMETRI TABUNG (LEVEL % DAN VOLUME mL)
// ===============================================================================
void calculateTankMetrics(float distanceCm, float &levelPercent, float &volumeMl) {
  if (distanceCm < 0) {
    levelPercent = 0.0f;
    volumeMl     = 0.0f;
    return;
  }

  // Tinggi cairan dalam tangki = Tinggi Tabung (14.5 cm) - Jarak Sensor ke Permukaan
  float liquidHeight = constrain(TANK_HEIGHT_CM - distanceCm, 0.0f, TANK_HEIGHT_CM);
  
  // Persentase Ketinggian Liquid (0% - 100%)
  levelPercent = (liquidHeight / TANK_HEIGHT_CM) * 100.0f;

  // Volume Liquid dalam mL (V = Level% * Volume Total 822.5 mL)
  volumeMl = (levelPercent / 100.0f) * TANK_TOTAL_VOL_ML;
}

// ===============================================================================
// UPLOAD DATA TELEMETRI LENGKAP KE SERVER PYTHONANYWHERE (/telemetry)
// ===============================================================================
bool sendTelemetryToServer(int soilPercent, float bioPercent, float bioVolMl, float waterPercent, float waterVolMl) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(6000);

  if (!client.connect(SERVER_HOST, SERVER_PORT)) {
    return false;
  }

  #if ARDUINOJSON_VERSION_MAJOR >= 7
    JsonDocument doc;
  #else
    StaticJsonDocument<512> doc;
  #endif

  doc["soil_moisture_percent"]      = soilPercent;
  doc["biopesticide_level_percent"] = (int)bioPercent;
  doc["biopesticide_vol_ml"]        = (int)bioVolMl;
  doc["water_level_percent"]        = (int)waterPercent;
  doc["water_vol_ml"]               = (int)waterVolMl;

  String jsonStr;
  serializeJson(doc, jsonStr);

  client.printf("POST %s HTTP/1.1\r\n", TELEMETRY_PATH);
  client.printf("Host: %s\r\n", SERVER_HOST);
  client.println("User-Agent: BESTARI-ESP32-CAM/2.0");
  client.println("Content-Type: application/json");
  client.printf("Content-Length: %d\r\n", jsonStr.length());
  client.println("Connection: close");
  client.println(); // Header separator (Baris Kosong Wajib HTTP Protocol)
  client.println(jsonStr); // Body Payload JSON

  Serial.println("[HTTPS TELEMETRY] Berhasil terkirim ke Server AI /telemetry.");
  client.stop();
  return true;
}

// ===============================================================================
// INISIALISASI KAMERA OV2640
// ===============================================================================
bool initCamera() {
  #if ENABLE_CAMERA
    camera_config_t config = {}; // Zero-initialize struct untuk cegah garbage memory!
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
    config.pin_sscb_sda = SIOD_GPIO_NUM;
    config.pin_sscb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn     = PWDN_GPIO_NUM;
    config.pin_reset    = RESET_GPIO_NUM;

    // Frekuensi XCLK 20MHz untuk kestabilan sinkronisasi kamera OV2640
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;

    // Alokasi Frame Buffer di Internal DRAM (Mode Hemat Daya & Bebas Crash)
    config.frame_size   = FRAMESIZE_QVGA; // 320x240 (Resolusi hemat memori & hemat daya)
    config.jpeg_quality = 12;             // Quality 12 (Bagus & Ringan)
    config.fb_count     = 1;
    config.fb_location  = CAMERA_FB_IN_DRAM;
    config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY; // Mode stabil untuk DRAM fb_count = 1
    Serial.println("[SYSTEM INFO] Kamera dikonfigurasi dalam Mode Hemat Daya DRAM (QVGA 320x240).");

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
      Serial.printf("[KAMERA] Gagal inisialisasi modul kamera. Error code: 0x%x\n", err);
      return false;
    }

    Serial.println("[KAMERA] Modul Kamera OV2640 Berhasil Diinisialisasi.");
    return true;
  #else
    return false;
  #endif
}

// ===============================================================================
// MEMBACA SENSOR ULTRASONIK (HC-SR04 WITH COMBINED TRIG)
// ===============================================================================
float readUltrasonicDistance(int echoPin) {
  // Pulsa Triger 10 mikrodetik pada Shared TRIG Pin (GPIO 12)
  digitalWrite(US_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(US_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(US_TRIG_PIN, LOW);

  // Timeout 30ms (~5 meter)
  long duration = pulseIn(echoPin, HIGH, 30000);
  if (duration == 0) return -1.0; // Out of range / sensor disconnect
  return (duration * 0.0343) / 2.0;
}

// ===============================================================================
// MEMBACA SENSOR KELEMBABAN TANAH (GPIO 13 / ADC2_CH4 DENGAN TRIK WI-FI PAUSE)
// ===============================================================================
int readSoilMoistureAnalog() {
  // Jika Wi-Fi sedang aktif, matikan sebentar driver Wi-Fi agar ADC2 (GPIO 13) bebas dari lock
  bool wifiActive = (WiFi.status() == WL_CONNECTED);
  if (wifiActive) {
    esp_wifi_stop();
    delay(10);
  }

  int sum = 0;
  for (int i = 0; i < 5; i++) {
    sum += analogRead(SOIL_SENSOR_PIN);
    delay(5);
  }

  // Nyalakan kembali Wi-Fi
  if (wifiActive) {
    esp_wifi_start();
    delay(10);
  }

  return sum / 5;
}

// ===============================================================================
// KONTROL AKTUATOR CERDAS
// ===============================================================================

// 1. Eksekusi Penyemprotan Biopestisida & Pengaduk
void executeBioPesticideSpraying(unsigned long customDurationMs = 0) {
  unsigned long sprayDuration = (customDurationMs > 0) ? customDurationMs : SPRAY_BIOPESTICIDE_MS;

  Serial.println("\n[AKTUATOR] >>> MEMULAI MODE BIOPESTISIDA <<<");
  
  // Step 1: Menyalakan Dinamo Pengaduk (IN1 - GPIO 14)
  Serial.println("[AKTUATOR] Step 1: Dinamo Pengaduk ON (GPIO 14)...");
  digitalWrite(RELAY_MIXER_PIN, RELAY_ON);
  delay(MIXING_DURATION_MS);

  // Step 2: Menyalakan Pompa Semprot (IN2 - GPIO 15)
  Serial.printf("[AKTUATOR] Step 2: Pompa Semprot ON (GPIO 15) selama %lu ms...\n", sprayDuration);
  digitalWrite(RELAY_PUMP_PIN, RELAY_ON);
  delay(sprayDuration);

  // Step 3: Mematikan Seluruh Aktuator
  Serial.println("[AKTUATOR] Step 3: Mematikan Pompa & Dinamo Pengaduk...");
  digitalWrite(RELAY_PUMP_PIN, RELAY_OFF);
  delay(300);
  digitalWrite(RELAY_MIXER_PIN, RELAY_OFF);
  Serial.println("[AKTUATOR] Siklus Biopestisida Selesai.\n");
}

// 2. Eksekusi Penyiraman Air Tanah
void executeSoilWatering() {
  Serial.println("\n[AKTUATOR] >>> MEMULAI MODE PENYIRAMAN AIR TANAH <<<");
  
  // Pastikan Dinamo Pengaduk MATI
  digitalWrite(RELAY_MIXER_PIN, RELAY_OFF);

  // Menyalakan Pompa Air (IN2 - GPIO 15)
  Serial.printf("[AKTUATOR] Pompa Air ON (GPIO 15) selama %lu ms...\n", WATERING_SOIL_MS);
  digitalWrite(RELAY_PUMP_PIN, RELAY_ON);
  delay(WATERING_SOIL_MS);

  // Mematikan Pompa Air
  digitalWrite(RELAY_PUMP_PIN, RELAY_OFF);
  Serial.println("[AKTUATOR] Pompa Air OFF. Penyiraman Selesai.\n");
}

// ===============================================================================
// KONEKSI WI-FI DENGAN DIAGNOSTIK WI-FI SCANNER LENGKAP
// ===============================================================================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("\n[WIFI] Menghubungkan ke SSID: %s\n", WIFI_SSID);
  WiFi.persistent(false); // Cegah konflik cache NVS flash lama
  WiFi.disconnect(true);
  delay(100);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.setSleep(false); // Nonaktifkan modem sleep Wi-Fi agar sinyal radio maksimal

  // Scan jaringan Wi-Fi sekitar untuk memastikan SSID terdeteksi
  Serial.println("[WIFI] Memindai jaringan Wi-Fi 2.4GHz di sekitar...");
  int n = WiFi.scanNetworks();
  bool foundSSID = false;
  if (n == 0) {
    Serial.println("[WIFI WARN] Tidak ada jaringan Wi-Fi 2.4GHz yang terdeteksi!");
  } else {
    Serial.printf("[WIFI] Ditemukan %d jaringan Wi-Fi:\n", n);
    for (int i = 0; i < n; ++i) {
      Serial.printf("   %d: %s (Sinyal: %d dBm) %s\n", i + 1, WiFi.SSID(i).c_str(), WiFi.RSSI(i), (WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? "[OPEN]" : "[SECURE]");
      if (WiFi.SSID(i) == WIFI_SSID) {
        foundSSID = true;
      }
    }
  }

  if (!foundSSID) {
    Serial.printf("[WIFI ERROR] SSID '%s' TIDAK TERDAPAT dalam hasil scan 2.4GHz!\n", WIFI_SSID);
    Serial.println("[WIFI SUGGESTION] Pastikan Hotspot HP aktif, fitur 'Extend Compatibility' ON, dan SSID tidak tersembunyi.\n");
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // Aktifkan PMF (Protected Management Frames 802.11w) Khusus Windows 10/11 Mobile Hotspot
  wifi_config_t wifi_cfg;
  if (esp_wifi_get_config(WIFI_IF_STA, &wifi_cfg) == ESP_OK) {
    wifi_cfg.sta.pmf_cfg.capable = true;
    wifi_cfg.sta.pmf_cfg.required = false;
    esp_wifi_set_config(WIFI_IF_STA, &wifi_cfg);
  }

  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 30) {
    delay(500);
    Serial.print(".");
    attempt++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Terhubung Berhasil!");
    Serial.printf("[WIFI] IP Address: %s\n", WiFi.localIP().toString().c_str());
  } else {
    int st = WiFi.status();
    Serial.printf("\n[WIFI] Gagal terhubung (Timeout). Status Code: %d ", st);
    switch (st) {
      case WL_NO_SSID_AVAIL: Serial.println("(WL_NO_SSID_AVAIL: SSID tidak ditemukan)"); break;
      case WL_CONNECT_FAILED: Serial.println("(WL_CONNECT_FAILED: Password salah / Auth gagal)"); break;
      case WL_DISCONNECTED: Serial.println("(WL_DISCONNECTED: Terputus / Sinyal Lemah)"); break;
      default: Serial.println("(Unknown Status)"); break;
    }
  }
}

// Pin On-Board Flash LED (Lampu Kilat Super Terang ESP32-CAM - GPIO 4)
#define FLASH_LED_PIN        4
#define FLASH_BRIGHTNESS    25 // Mode PWM Hemat Daya (25/255) agar Laptop USB Tidak Drop Tegangan

// ===============================================================================
// UPLOAD FOTO KE SERVER PYTHONANYWHERE (/detect) DENGAN FLASH LED
// ===============================================================================
bool captureAndUploadPhoto() {
  #if ENABLE_CAMERA
    if (!isCameraInitialized) return false;

    // 1. Nyalakan Flash LED dalam Mode PWM Low-Power (Cegah Drop Tegangan USB Laptop)
    Serial.println("[KAMERA] Menyalakan Flash LED (Mode Hemat Daya)...");
    pinMode(FLASH_LED_PIN, OUTPUT);
    analogWrite(FLASH_LED_PIN, FLASH_BRIGHTNESS); // 10% kecerahan cukup untuk foto tanpa lonjakan arus
    delay(150); // Jeda 150ms agar auto-exposure sensor kamera menyesuaikan pencahayaan flash

    Serial.println("[KAMERA] Mengambil foto sampel daun...");
    
    // Ambil frame dari kamera OV2640
    camera_fb_t * fb = esp_camera_fb_get();
    if (!fb) {
      delay(200);
      fb = esp_camera_fb_get(); // Percobaan ulang jika frame pertama belum siap
    }

    // Matikan Flash LED setelah gambar diambil
    analogWrite(FLASH_LED_PIN, 0);
    digitalWrite(FLASH_LED_PIN, LOW);

    if (!fb) {
      Serial.println("[KAMERA] Gagal mengambil frame gambar.");
      return false;
    }

    if (WiFi.status() != WL_CONNECTED) {
      esp_camera_fb_return(fb);
      return false;
    }

    WiFiClientSecure client;
    client.setInsecure();
    client.setTimeout(10000);

    if (!client.connect(SERVER_HOST, SERVER_PORT)) {
      Serial.println("[HTTPS] Gagal membuka koneksi SSL untuk upload foto.");
      esp_camera_fb_return(fb);
      return false;
    }

    String boundary = "----ESP32CAMBoundaryStr";
    String head = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"capture.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
    String tail = "\r\n--" + boundary + "--\r\n";

    uint32_t extraLen = head.length() + tail.length();
    uint32_t totalLen = fb->len + extraLen;

    client.printf("POST %s HTTP/1.1\r\n", DETECT_PATH);
    client.printf("Host: %s\r\n", SERVER_HOST);
    client.println("User-Agent: ESP32-CAM-Bestari/2.0");
    client.printf("Content-Type: multipart/form-data; boundary=%s\r\n", boundary.c_str());
    client.printf("Content-Length: %d\r\n\r\n", totalLen);

    client.print(head);
    client.write(fb->buf, fb->len);
    client.print(tail);

    esp_camera_fb_return(fb); // Kembalikan frame buffer

    Serial.println("[HTTPS] Foto dengan Flash LED berhasil dikirim ke server AI /detect.");
    client.stop();
    return true;
  #else
    return false;
  #endif
}

// ===============================================================================
// KOMUNIKASI HTTPS KE SERVER PYTHONANYWHERE (CEK DETEKSI HAMA TERBARU)
// ===============================================================================
bool fetchServerStatus(bool &threatDetected, int &ulatCount, unsigned long &customSprayMs, bool &manualPumpActive) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure(); // Mengabaikan validasi SSL certificate
  client.setTimeout(8000);

  if (!client.connect(SERVER_HOST, SERVER_PORT)) {
    Serial.println("[HTTPS] Gagal membuka koneksi ke server PythonAnywhere.");
    return false;
  }

  // Kirim HTTP GET request ke /status/latest
  client.printf("GET %s HTTP/1.1\r\n", STATUS_PATH);
  client.printf("Host: %s\r\n", SERVER_HOST);
  client.println("User-Agent: BESTARI-ESP32-CAM/2.0");
  client.println("Connection: close\r\n");

  unsigned long timeout = millis();
  while (client.connected() && !client.available()) {
    if (millis() - timeout > 8000) {
      client.stop();
      return false;
    }
    delay(20);
  }

  String response = "";
  unsigned long readStart = millis();
  while (client.connected() || client.available()) {
    while (client.available()) {
      char c = (char)client.read();
      response += c;
      readStart = millis();
    }
    if (response.length() > 0 && (millis() - readStart > 2000)) break;
    delay(10);
  }
  client.stop();

  int firstBrace = response.indexOf('{');
  int lastBrace  = response.lastIndexOf('}');
  if (firstBrace == -1 || lastBrace == -1 || lastBrace <= firstBrace) {
    return false;
  }

  String jsonBody = response.substring(firstBrace, lastBrace + 1);

  #if ARDUINOJSON_VERSION_MAJOR >= 7
    JsonDocument doc;
  #else
    StaticJsonDocument<2048> doc;
  #endif

  DeserializationError error = deserializeJson(doc, jsonBody);
  if (error) {
    Serial.printf("[JSON] Deserialization error: %s\n", error.c_str());
    return false;
  }

  threatDetected   = doc["pest_detected"] | (doc["threat_detected"] | false);
  ulatCount        = doc["ulat_grayak_count"] | 0;
  manualPumpActive = doc["relay_active"] | false;
  customSprayMs    = 5000; // Default

  if (doc["config"]["spray_duration_sec"].is<int>()) {
    customSprayMs = doc["config"]["spray_duration_sec"].as<int>() * 1000;
  }

  return true;
}

// ===============================================================================
// SIKLUS MONITORING DAN PENGAMBILAN KEPUTUSAN
// ===============================================================================
void processTelemetryAndControl() {
  // 1. Membaca Sensor Fisik SEBELUM / SAAT koneksi Wi-Fi
  int rawSoil = readSoilMoistureAnalog();

  // Membaca Sensor Ultrasonik secara bergantian dengan jeda 50ms agar tidak terjadi interference
  float dist1 = readUltrasonicDistance(US1_ECHO_PIN); // ECHO1 -> GPIO 16 (Tangki Biopestisida)
  delay(50);
  float dist2 = readUltrasonicDistance(US2_ECHO_PIN); // ECHO2 -> GPIO 3 (Tangki Air Bersih)

  // Konversi estimasi kelembaban tanah (0% = sangat kering, 100% = basah)
  int soilPercent = map(constrain(rawSoil, 1000, 3500), 3500, 1000, 0, 100);
  bool isSoilDry  = (rawSoil >= SOIL_DRY_THRESHOLD);

  // Hitung Metrik Geometri Tangki Biopestisida & Tangki Air Bersih (Tinggi: 14.5 cm, Dia: 8.5 cm)
  float bioLevelPercent = 0.0f, bioVolMl = 0.0f;
  float waterLevelPercent = 0.0f, waterVolMl = 0.0f;

  calculateTankMetrics(dist1, bioLevelPercent, bioVolMl);
  calculateTankMetrics(dist2, waterLevelPercent, waterVolMl);

  // Print Telemetri Lengkap ke Serial Monitor
  Serial.println("\n=======================================================================");
  Serial.println("               📊 [TELEMETRI SENSOR ESP32-CAM MAIN BOARD]              ");
  Serial.println("=======================================================================");
  
  // A. Sensor Kelembaban Tanah (GPIO 13 ADC2_CH4)
  Serial.println(" 🌿 [1] SENSOR KELEMBABAN TANAH (GPIO 13 / ADC2_CH4):");
  Serial.printf("     - Nilai ADC Raw    : %d / 4095 (Estimasi Tegangan: %.2f V)\n", rawSoil, (rawSoil * 3.3 / 4095.0));
  Serial.printf("     - Kelembaban Tanah : ~%d%%  -> Status: %s\n", soilPercent, isSoilDry ? "[KERING - Butuh Siram!]" : "[LEMBAB - Cukup Air]");
  Serial.printf("     - Threshold Dry    : >= %d ADC\n", SOIL_DRY_THRESHOLD);
  
  // B. Sensor Ultrasonik 1 (Tangki Biopestisida - ECHO GPIO 16)
  Serial.println(" 🧪 [2] TANGKI BIOPESTISIDA (Tinggi: 14.5 cm, Dia: 8.5 cm, Vol Total: ~822.5 mL):");
  if (dist1 < 0) {
    Serial.println("     - Status Sensor    : [ERROR / SENSOR TERPUTUS / OUT OF RANGE]");
  } else {
    Serial.printf("     - Jarak Permukaan  : %.2f cm (Tinggi Cairan: %.2f cm)\n", dist1, constrain(TANK_HEIGHT_CM - dist1, 0.0f, TANK_HEIGHT_CM));
    Serial.printf("     - Persentase Level : %.1f%%\n", bioLevelPercent);
    Serial.printf("     - Sisa Volume      : %.1f mL / %.1f mL  -> Status: %s\n", 
                  bioVolMl, TANK_TOTAL_VOL_ML, (bioLevelPercent < 20.0f) ? "[PERINGATAN: TANGKI HAMPIR HABIS!]" : "[TERISI / CUKUP]");
  }

  // C. Sensor Ultrasonik 2 (Tangki Air Bersih - ECHO GPIO 3)
  Serial.println(" 💧 [3] TANGKI AIR BERSIH (Tinggi: 14.5 cm, Dia: 8.5 cm, Vol Total: ~822.5 mL):");
  if (dist2 < 0) {
    Serial.println("     - Status Sensor    : [ERROR / SENSOR TERPUTUS / OUT OF RANGE]");
  } else {
    Serial.printf("     - Jarak Permukaan  : %.2f cm (Tinggi Cairan: %.2f cm)\n", dist2, constrain(TANK_HEIGHT_CM - dist2, 0.0f, TANK_HEIGHT_CM));
    Serial.printf("     - Persentase Level : %.1f%%\n", waterLevelPercent);
    Serial.printf("     - Sisa Volume      : %.1f mL / %.1f mL  -> Status: %s\n", 
                  waterVolMl, TANK_TOTAL_VOL_ML, (waterLevelPercent < 20.0f) ? "[PERINGATAN: TANGKI HAMPIR HABIS!]" : "[TERISI / CUKUP]");
  }
  Serial.println("=======================================================================\n");

  // 2. Hubungi Server AI PythonAnywhere & Kirim Telemetri
  connectWiFi();

  // Kirim data telemetri persenan & volume ke Server Cloud
  sendTelemetryToServer(soilPercent, bioLevelPercent, bioVolMl, waterLevelPercent, waterVolMl);

  // Ambil sampel foto tanaman dengan Flash LED dan upload ke server AI (/detect)
  captureAndUploadPhoto();

  bool threatDetected   = false;
  int  ulatCount        = 0;
  unsigned long sprayMs = 5000;
  bool manualPumpActive = false;

  bool serverOk = fetchServerStatus(threatDetected, ulatCount, sprayMs, manualPumpActive);

  if (serverOk) {
    Serial.printf("[SERVER AI] Status Hama: %s | Ulat Grayak: %d ekor | Manual Trigger: %s\n",
                  threatDetected ? "TERDETEKSI BAHAYA!" : "AMAN (Bebas Hama)",
                  ulatCount, manualPumpActive ? "AKTIF" : "OFF");
  } else {
    Serial.println("[SERVER AI] Tidak dapat mengambil status cloud. Menggunakan Logika Sensor Lokal.");
  }

  // 3. Logika Keputusan Otomatis
  if (threatDetected || manualPumpActive) {
    // Prioritas 1: Hama Terdeteksi / Pemicuan Manual -> Semprot Biopestisida & Pengaduk
    executeBioPesticideSpraying(sprayMs);
  } 
  else if (isSoilDry) {
    // Prioritas 2: Bebas Hama tapi Tanah Kering -> Siram Air Tanah Netral
    executeSoilWatering();
  } 
  else {
    // Prioritas 3: Standby (Tanaman Bebas Hama & Tanah Cukup Lembab)
    Serial.println("[SISTEM] Status: STANDBY (Kondisi Ideal).\n");
  }
}

// ===============================================================================
// SETUP & LOOP UTAMA
// ===============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n========================================================");
  Serial.println("   BESTARI - ESP32-CAM Main Board Controller Initiated");
  Serial.println("   Configuration: Dual Relay + Shared TRIG + OV2640 AI");
  Serial.println("========================================================");

  // 1. Inisialisasi Relay (Glitch Protection Active-LOW)
  // Menulis HIGH sebelum pinMode untuk mencegah relay 'klik/flicker' saat awal nyala
  digitalWrite(RELAY_MIXER_PIN, RELAY_OFF);
  digitalWrite(RELAY_PUMP_PIN,  RELAY_OFF);

  pinMode(RELAY_MIXER_PIN, OUTPUT);
  pinMode(RELAY_PUMP_PIN,  OUTPUT);

  // 2. Inisialisasi Pin Ultrasonik (Shared TRIG GPIO 12, ECHO GPIO 16 & GPIO 3)
  pinMode(US_TRIG_PIN, OUTPUT);
  digitalWrite(US_TRIG_PIN, LOW);

  pinMode(US1_ECHO_PIN, INPUT);
  pinMode(US2_ECHO_PIN, INPUT);

  // 3. Inisialisasi Sensor Kelembaban Tanah (GPIO 13 - ADC2_CH4 dengan Wi-Fi Pause)
  pinMode(SOIL_SENSOR_PIN, INPUT);

  // 4. Inisialisasi Modul Kamera OV2640
  isCameraInitialized = initCamera();

  // 5. Inisialisasi Koneksi Wi-Fi
  connectWiFi();

  Serial.println("[SETUP] Inisialisasi Hardware Selesai. Memulai Operasi Main Board...\n");
}

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - lastPollTime >= POLL_INTERVAL_MS || lastPollTime == 0) {
    lastPollTime = currentMillis;
    processTelemetryAndControl();
  }

  delay(50); // Yield CPU untuk menjaga kestabilan ESP32 watchdog
}
