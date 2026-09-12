/*
  ===============================================================================
    BESTARI (Samsung Solve for Tomorrow 2026) - ESP32-CAM Firmware (PRODUCTION READY)
    Sistem Otomatis Deteksi Hama Ulat Grayak & Kelembaban Tanah
    Aktuator: Pengaduk Biopestisida, Pompa Penyiram Air & Biopestisida
  ===============================================================================
    Penulis     : Tim BESTARI SMAN Sumatera Selatan
    Board       : AI Thinker ESP32-CAM (OV2640)
    
    Skema Hardware & Port Pinout (Terkonfirmasi Aman):
    -----------------------------------------------------------------------------
    TP4056 & Solar Panel:
      - Solar Panel (+) / (-) -> IN+ / IN- TP4056
      - TP4056 Out+ -> Step-Up IN+, COM Relay Ch1, COM Relay Ch2
      - Step-Up Out+ -> 5V ESP32-CAM, VCC Relay
      - Step-Up Out- -> GND ESP32-CAM, Pompa (-), GND Relay, Dinamo (-), GND Sensor

    Relay 2-Channel (Active LOW):
      - IN1 -> GPIO 14 (Dinamo Pengaduk Biopestisida Positif via NO Ch1)
      - IN2 -> GPIO 15 (Pompa Penyemprot / Penyiram Positif via NO Ch2)

    Sensor Kelembaban Tanah (Soil Moisture):
      - VCC -> 3V3 ESP32-CAM
      - A0  -> GPIO 13 ESP32-CAM (ADC2 Channel 4)
  ===============================================================================
*/

#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "driver/adc.h"

// ===============================================================================
// 1. KONFIGURASI WIFI & SERVER FLASK AI PYTHONANYWHERE
// ===============================================================================
const char* WIFI_SSID     = "mjid";         // Ganti dengan SSID Wi-Fi Anda
const char* WIFI_PASSWORD = "8765432111";     // Ganti dengan Password Wi-Fi Anda

// Host SSL & Path Server PythonAnywhere Anda
// Contoh jika URL Anda: "https://bestari-ai.pythonanywhere.com/detect"
const char* SERVER_HOST   = "https://halimadi.pythonanywhere.com/"; // Ganti dengan username PythonAnywhere Anda
const int   SERVER_PORT   = 443;                          // Port 443 untuk HTTPS
const char* SERVER_PATH   = "/detect";                    // Endpoint Flask

// Interval pengujian foto & sensor (ms) -> 30 detik
const unsigned long CAPTURE_INTERVAL_MS = 30000;

// Durasi Pengadukan Biopestisida (Mixer Motor) -> 4 detik
const unsigned long MIXING_DURATION_MS  = 4000;

// Durasi Penyemprotan Biopesticida (Spray Pump) -> 5 detik
const unsigned long SPRAY_BIOPESTICIDE_MS = 5000;

// Durasi Penyiraman Air Tanah (Watering Pump) -> 4 detik
const unsigned long WATERING_SOIL_MS     = 4000;

// Ambang Batas Kelembaban Tanah (Nilai ADC 12-bit ESP32: 0 - 4095)
// Kering: > 2500, Lembab/Basah: < 2200
const int DRY_SOIL_THRESHOLD_RAW = 2500;

// ===============================================================================
// 2. KONFIGURASI RELAY & PINOUT HARDWARE ESP32-CAM
// ===============================================================================
// Logika Relai 2-Channel Active LOW
#define RELAY_ON  LOW   // LOW = Relay Menyala
#define RELAY_OFF HIGH  // HIGH = Relay Mati

#define MIXER_RELAY_PIN  14 // IN1 Relay -> GPIO 14 (Dinamo Pengaduk)
#define PUMP_RELAY_PIN   15 // IN2 Relay -> GPIO 15 (Pompa Semprot / Air)
#define SOIL_SENSOR_PIN  13 // A0 Sensor Moisture -> GPIO 13
#define FLASH_LED_PIN     4 // GPIO 4  -> Flash LED Kamera (Opsional)

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
// FUNGSI INISIALISASI KAMERA OV2640
// ===============================================================================
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

  if (psramFound()) {
    config.frame_size   = FRAMESIZE_VGA; // Resolusi 640x480 (Optimal untuk YOLO)
    config.jpeg_quality = 10;            // Skala Kualitas 0-63
    config.fb_count     = 2;
    Serial.println("[BESTARI CAM] PSRAM Terdeteksi! Mode VGA (640x480).");
  } else {
    config.frame_size   = FRAMESIZE_CIF; // 400x296 jika tanpa PSRAM
    config.jpeg_quality = 12;
    config.fb_count     = 1;
    Serial.println("[BESTARI CAM] PSRAM Tidak Ditemukan. Mode CIF.");
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[BESTARI CAM ERROR] Gagal inisialisasi kamera! Error: 0x%x\n", err);
    return false;
  }

  sensor_t * s = esp_camera_sensor_get();
  s->set_vflip(s, 1);   // Flip vertikal jika kamera terbalik
  s->set_hmirror(s, 0);

  Serial.println("[BESTARI CAM] Driver Kamera OV2640 Berhasil Diaktifkan.");
  return true;
}

// Inisialisasi Wi-Fi
void connectWiFi() {
  Serial.print("[BESTARI NETWORK] Menghubungkan ke Wi-Fi ");
  Serial.print(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 25) {
    delay(500);
    Serial.print(".");
    attempt++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[BESTARI NETWORK] Wi-Fi Terhubung!");
    Serial.print("[BESTARI NETWORK] IP ESP32-CAM: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[BESTARI NETWORK ERROR] Gagal terhubung ke Wi-Fi.");
  }
}

// ===============================================================================
// MEMBACA SENSOR SOIL MOISTURE (GPIO 13 / ADC2_CH4)
// ===============================================================================
int readSoilMoisturePercentage(int &rawVal) {
  // Gunakan adc2_get_raw untuk menghindari konflik driver Wi-Fi dengan ADC2
  int sum = 0;
  int validReadings = 0;
  
  for (int i = 0; i < 5; i++) {
    int readVal = 0;
    esp_err_t r = adc2_get_raw(ADC2_CHANNEL_4, ADC_WIDTH_12Bit, &readVal);
    if (r == ESP_OK) {
      sum += readVal;
      validReadings++;
    } else {
      sum += analogRead(SOIL_SENSOR_PIN);
      validReadings++;
    }
    delay(10);
  }

  rawVal = (validReadings > 0) ? (sum / validReadings) : 3000;

  // Kalibrasi persentase kelembaban (0% - 100%)
  int percentage = map(rawVal, 3500, 1400, 0, 100);
  percentage = constrain(percentage, 0, 100);
  
  return percentage;
}

// ===============================================================================
// EKSEKUSI AKTUATOR DENGAN PERLINDUNGAN SAFEGUARD
// ===============================================================================

// Action A: Menyemprot Bio-Pestisida (Hama Terdeteksi / Pemicu Manual)
void executeBioPesticideSpraying(int ulatCount, unsigned long customDurationMs = 0) {
  unsigned long duration = (customDurationMs > 0) ? customDurationMs : SPRAY_BIOPESTICIDE_MS;

  Serial.println("\n=========================================================");
  Serial.printf("⚠️ MENJALANKAN PENYEMPROTAN BIO-PESTISIDA (Durasi: %lu ms)!\n", duration);
  Serial.println("=========================================================");

  // Step 1: Menyalakan Dinamo Pengaduk (GPIO 14)
  Serial.println("[AKTUATOR] STEP 1: Menyalakan Dinamo Pengaduk Biopestisida (GPIO 14)...");
  digitalWrite(MIXER_RELAY_PIN, RELAY_ON);
  delay(MIXING_DURATION_MS);

  // Step 2: Menyalakan Pompa Semprot (GPIO 15)
  Serial.println("[AKTUATOR] STEP 2: Menyalakan Pompa Semprot Biopestisida (GPIO 15)...");
  digitalWrite(PUMP_RELAY_PIN, RELAY_ON);
  delay(duration);

  // Step 3: Mematikan Seluruh Aktuator
  Serial.println("[AKTUATOR] STEP 3: Selesai. Mematikan Pompa & Dinamo...");
  digitalWrite(PUMP_RELAY_PIN, RELAY_OFF);
  delay(300);
  digitalWrite(MIXER_RELAY_PIN, RELAY_OFF);
  Serial.println("[AKTUATOR] Status: Kembali Standby.\n");
}

// Action B: Menyiram Tanah Dengan Air (Tanah Kering & Tidak Ada Hama)
void executeSoilWatering(int soilMoisturePercent) {
  Serial.println("\n=========================================================");
  Serial.printf("🌱 TANAH KERING (%d%%) - Bebas Hama\n", soilMoisturePercent);
  Serial.println("   --> Menjalankan Mode Menyiram Tanah dengan AIR");
  Serial.println("=========================================================");

  // Dinamo Mixer tetap MATI
  digitalWrite(MIXER_RELAY_PIN, RELAY_OFF);

  // Menyalakan Pompa Air (GPIO 15)
  Serial.println("[AKTUATOR] Menyalakan Pompa Air Menyiram Tanah (GPIO 15)...");
  digitalWrite(PUMP_RELAY_PIN, RELAY_ON);
  delay(WATERING_SOIL_MS);

  // Mematikan Pompa Air
  Serial.println("[AKTUATOR] Selesai Menyiram. Mematikan Pompa...");
  digitalWrite(PUMP_RELAY_PIN, RELAY_OFF);
  Serial.println("[AKTUATOR] Status: Kembali Standby.\n");
}

// ===============================================================================
// PENGIRIMAN MULTIPART HTTPS FOTO KE PYTHONANYWHERE (STREAMING AMAN)
// ===============================================================================
bool sendPhotoToPythonAnywhere(camera_fb_t* fb, String &jsonResponse) {
  WiFiClientSecure client;
  client.setInsecure(); // Skip verifikasi sertifikat SSL untuk kemudahan PythonAnywhere
  client.setTimeout(15000);

  Serial.printf("[BESTARI NETWORK] Menghubungkan ke https://%s:%d%s ...\n", SERVER_HOST, SERVER_PORT, SERVER_PATH);

  if (!client.connect(SERVER_HOST, SERVER_PORT)) {
    Serial.println("[BESTARI NETWORK ERROR] Gagal terhubung via SSL ke PythonAnywhere!");
    return false;
  }

  String boundary = "----BESTARIBoundaryESP32CAM";
  String head = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"image\"; filename=\"capture.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
  String tail = "\r\n--" + boundary + "--\r\n";

  uint32_t totalLen = head.length() + fb->len + tail.length();

  // Kirim Header HTTP/1.1 POST
  client.printf("POST %s HTTP/1.1\r\n", SERVER_PATH);
  client.printf("Host: %s\r\n", SERVER_HOST);
  client.printf("Content-Type: multipart/form-data; boundary=%s\r\n", boundary.c_str());
  client.printf("Content-Length: %u\r\n", totalLen);
  client.println("Connection: close\r\n");

  // Stream Body multipart (Header + Buffer Kamera + Tail)
  client.print(head);
  
  uint8_t *fbBuf = fb->buf;
  size_t fbLen = fb->len;
  size_t chunkSize = 1024;
  for (size_t n = 0; n < fbLen; n += chunkSize) {
    size_t toWrite = (n + chunkSize < fbLen) ? chunkSize : (fbLen - n);
    client.write(fbBuf + n, toWrite);
  }
  
  client.print(tail);
  client.flush();

  Serial.println("[BESTARI NETWORK] Foto berhasil di-stream! Menunggu respon server AI...");

  // Baca Response Server
  unsigned long timeout = millis();
  while (client.connected() && !client.available()) {
    if (millis() - timeout > 10000) {
      Serial.println("[BESTARI NETWORK ERROR] Timeout menunggu respon server!");
      client.stop();
      return false;
    }
    delay(50);
  }

  // Parse HTTP Header & Extract JSON Body
  bool isBody = false;
  jsonResponse = "";
  while (client.available()) {
    String line = client.readStringUntil('\n');
    if (line == "\r" || line == "") {
      isBody = true;
      continue;
    }
    if (isBody) {
      jsonResponse += line;
    }
  }

  client.stop();
  return (jsonResponse.length() > 0);
}

// ===============================================================================
// ALUR UTAMA MONITORING & KONTROL
// ===============================================================================
void processDetectionAndControl() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[BESTARI NETWORK] Wi-Fi Terputus. Menghubungkan ulang...");
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) return;
  }

  // 1. Baca Kelembaban Tanah terlebih dahulu
  int rawSoilVal = 0;
  int soilPercent = readSoilMoisturePercentage(rawSoilVal);
  bool isSoilDry = (rawSoilVal >= DRY_SOIL_THRESHOLD_RAW);

  Serial.printf("\n[SENSOR SOIL] GPIO 13 | Raw ADC: %d | Kelembaban: %d%% | Status: %s\n",
                rawSoilVal, soilPercent, isSoilDry ? "KERING ⚠️" : "LEMBAB / CUKUP ✅");

  // 2. Tangkap Gambar dari Kamera OV2640
  Serial.println("[BESTARI CAM] Menangkap foto tanaman...");
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("[BESTARI CAM ERROR] Gagal menangkap gambar dari OV2640!");
    return;
  }
  Serial.printf("[BESTARI CAM] Foto ditangkap! Ukuran: %u byte.\n", fb->len);

  // 3. Kirim Foto ke PythonAnywhere & Terima JSON
  String jsonResponse = "";
  bool uploadSuccess = sendPhotoToPythonAnywhere(fb, jsonResponse);

  // Selalu bebaskan memori framebuffer kamera!
  esp_camera_fb_return(fb);

  if (!uploadSuccess) {
    Serial.println("[BESTARI SERVER ERROR] Pengiriman foto gagal.");
    // Jika server error namun tanah kering, tetap siram air demi keselamatan tanaman
    if (isSoilDry) {
      executeSoilWatering(soilPercent);
    }
    return;
  }

  Serial.println("[SERVER RESPONSE] JSON: " + jsonResponse);

  // 4. Parsing JSON dari Server AI
  bool threatDetected = false;
  int ulatCount = 0;
  unsigned long customSprayDurationMs = 0;

  #if ARDUINOJSON_VERSION_MAJOR >= 7
    JsonDocument doc;
  #else
    StaticJsonDocument<1024> doc;
  #endif

  DeserializationError error = deserializeJson(doc, jsonResponse);
  if (!error) {
    threatDetected = doc["threat_detected"] | false;
    ulatCount = doc["ulat_grayak_count"] | 0;
    customSprayDurationMs = doc["spray_duration_ms"] | 0;
    const char* relayAction = doc["relay_action"] | "IDLE";
    const char* plantStatus = doc["plant_status"] | "safe";

    Serial.printf("[ANALISIS AI] Status: %s | Ulat: %d | Aksi AI: %s | Durasi: %lu ms\n",
                  plantStatus, ulatCount, relayAction, customSprayDurationMs);

    if (String(relayAction) == "TRIGGER_SPRAY" || ulatCount > 0) {
      threatDetected = true;
    }
  } else {
    Serial.print("[JSON ERROR] Parsing JSON Gagal: ");
    Serial.println(error.c_str());
  }

  // 5. Keputusan Aktuator Otomatis
  if (threatDetected) {
    executeBioPesticideSpraying(ulatCount, customSprayDurationMs);
  } else if (isSoilDry) {
    executeSoilWatering(soilPercent);
  } else {
    Serial.println("[BESTARI SYSTEM] ✅ Kondisi Aman: Tanah Lembab & Bebas Hama. Standby.\n");
  }
}

// ===============================================================================
// SETUP & MAIN LOOP
// ===============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  // PERLINDUNGAN HARDWARE: Set output HIGH (OFF) SEBELUM pinMode() untuk cegah Relay menghentak
  digitalWrite(MIXER_RELAY_PIN, RELAY_OFF);
  digitalWrite(PUMP_RELAY_PIN, RELAY_OFF);
  digitalWrite(FLASH_LED_PIN, LOW);

  pinMode(MIXER_RELAY_PIN, OUTPUT);
  pinMode(PUMP_RELAY_PIN, OUTPUT);
  pinMode(FLASH_LED_PIN, OUTPUT);

  Serial.println("\n=========================================================");
  Serial.println("  BESTARI - ESP32-CAM AI Pest & Soil Monitoring System   ");
  Serial.println("  Samsung Solve for Tomorrow 2026                        ");
  Serial.println("=========================================================");

  // Inisialisasi Kamera OV2640
  if (!initCamera()) {
    Serial.println("[CRITICAL ERROR] Gagal inisialisasi kamera! Sistem dihentikan.");
    while (true) { delay(1000); }
  }

  // Inisialisasi ADC2 untuk Sensor Kelembaban Tanah
  adc2_config_channel_atten(ADC2_CHANNEL_4, ADC_ATTEN_DB_11);

  // Menghubungkan ke Wi-Fi
  connectWiFi();
}

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - lastCaptureTime >= CAPTURE_INTERVAL_MS) {
    lastCaptureTime = currentMillis;
    processDetectionAndControl();
  }
}
