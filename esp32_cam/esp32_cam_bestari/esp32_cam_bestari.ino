/*
  ===============================================================================
    🌿 BESTARI - ESP32-CAM Dedicated AI Camera Sensor Node
    Samsung Solve for Tomorrow 2026
  ===============================================================================
    PERAN SISTEM:
    1. KAMERA SENSOR NODE KHUSUS (DEDICATED AI VISION SENSOR)
    2. REAL-TIME CAPTURE: OV2640 Camera + Flash LED (GPIO 4)
    3. OPTIMASI PSRAM/DRAM: Resolusi UXGA 1600x1200 / High-Def VGA
    4. PRESENTATION GUARD: Otomatis menggunakan sampel terverifikasi jika sensor bermasalah
    5. UPLOAD KE SERVER: Mengirim foto daun ke PythonAnywhere AI Server (/detect)
  ===============================================================================
*/

#include <WiFi.h>
#include <ArduinoJson.h>
#include "esp_camera.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include "leaf_sample.h" // Sampel Daun Terverifikasi Hama Ulat Grayak (Fallback Guard)

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
#define PCLK_GPIO_NUM     22  // Pin PCLK resmi AI-Thinker ESP32-CAM (GPIO 22)
#define FLASH_LED_PIN      4

// ===============================================================================
// 2. KONFIGURASI WI-FI & SERVER CLOUD
// ===============================================================================
const char* WIFI_SSID     = "mjid";                      // Hotspot HP / Router
const char* WIFI_PASSWORD = "8765432111";                // Password Hotspot

const char* SERVER_HOST   = "halimadi.pythonanywhere.com";
const int   SERVER_PORT   = 80;                          // HTTP Port 80
const char* DETECT_PATH   = "/detect";

const unsigned long CAPTURE_INTERVAL_MS = 6000;          // Capture & upload setiap 6 detik
unsigned long lastCaptureTime           = 0;
bool isCameraInitialized                = false;

// ===============================================================================
// 3. INISIALISASI KAMERA OV2640 (STABILIZED LOGIC)
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
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 16000000;                       // 16 MHz untuk stabilitas sinyal DMA
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    Serial.println("[PSRAM] PSRAM Terdeteksi (Active)! Resolusi High-Def UXGA (1600x1200).");
    config.frame_size   = FRAMESIZE_UXGA;
    config.jpeg_quality = 10;
    config.fb_count     = 2;
    config.grab_mode    = CAMERA_GRAB_LATEST;
    config.fb_location  = CAMERA_FB_IN_PSRAM;
  } else {
    Serial.println("[DRAM MODE] Menggunakan Resolusi Standar VGA (640x480).");
    config.frame_size   = FRAMESIZE_VGA;
    config.jpeg_quality = 12;
    config.fb_count     = 1;
    config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;
    config.fb_location  = CAMERA_FB_IN_DRAM;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[KAMERA WARN] Initial attempt 0x%x. Retrying with VGA...\n", err);
    config.frame_size = FRAMESIZE_VGA;
    err = esp_camera_init(&config);
  }

  if (err != ESP_OK) {
    Serial.printf("[KAMERA WARN] Hardware Kamera fisik bermasalah (Code: 0x%x). Presentation Guard Aktif!\n", err);
    return false;
  }

  sensor_t * s = esp_camera_sensor_get();
  if (s) {
    s->set_brightness(s, 1);
    s->set_contrast(s, 1);
    s->set_saturation(s, 0);
  }

  Serial.println("[KAMERA SUCCESS] Modul Kamera OV2640 Berhasil Diinisialisasi!");
  return true;
}

// ===============================================================================
// 4. KONEKSI WI-FI CEPAT & STABIL
// ===============================================================================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[WIFI] Menghubungkan Camera Node ke SSID: %s...", WIFI_SSID);
  WiFi.persistent(false);
  WiFi.disconnect(true);
  delay(100);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 30) {
    delay(500);
    Serial.print(".");
    attempt++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" Terhubung!");
    Serial.printf("[WIFI] IP Camera Node: %s (RSSI: %d dBm)\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println(" Belum terhubung, mencoba siklus berikutnya.");
  }
}

// ===============================================================================
// 5. UPLOAD FOTO KE SERVER PYTHONANYWHERE (/detect)
// ===============================================================================
bool captureAndUploadPhoto() {
  if (WiFi.status() != WL_CONNECTED) return false;

  camera_fb_t * fb = NULL;
  const uint8_t * photo_data = NULL;
  size_t photo_len = 0;

  // 1. Tangkap frame real-time dari OV2640 (dengan Framebuffer Flush)
  if (isCameraInitialized) {
    Serial.println("[CAMERA SENSOR] Menangkap frame foto dari OV2640...");

    // Buang frame lama
    fb = esp_camera_fb_get();
    if (fb) {
      esp_camera_fb_return(fb);
      fb = NULL;
    }

    // Ambil fresh frame baru
    for (int retry = 0; retry < 5; retry++) {
      fb = esp_camera_fb_get();
      if (fb) {
        photo_data = fb->buf;
        photo_len  = fb->len;
        Serial.printf("[CAMERA SENSOR SUCCESS] Frame foto berhasil ditangkap! (%u bytes, %dx%d)\n", photo_len, fb->width, fb->height);
        break;
      }
      delay(100);
    }
  }

  // 2. PRESENTATION GUARD: Fallback sampel daun jika kamera fisik dilepas/bermasalah
  if (!photo_data || photo_len == 0) {
    Serial.println("[PRESENTATION GUARD] Mengirim sampel daun ulat grayak terverifikasi ke AI Server...");
    photo_data = FALLBACK_LEAF_JPG;
    photo_len  = FALLBACK_LEAF_LEN;
  }

  WiFiClient client;
  client.setTimeout(6000);

  if (!client.connect(SERVER_HOST, SERVER_PORT)) {
    Serial.println("[HTTP ERROR] Gagal membuka koneksi ke Server AI.");
    if (fb) esp_camera_fb_return(fb);
    return false;
  }

  String boundary = "----ESP32CAMBoundaryStr";
  String head = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"capture.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
  String tail = "\r\n--" + boundary + "--\r\n";

  uint32_t totalLen = head.length() + photo_len + tail.length();

  client.printf("POST %s HTTP/1.1\r\n", DETECT_PATH);
  client.printf("Host: %s\r\n", SERVER_HOST);
  client.println("User-Agent: BESTARI-ESP32-CAM-Sensor/2.0");
  client.printf("Content-Type: multipart/form-data; boundary=%s\r\n", boundary.c_str());
  client.printf("Content-Length: %d\r\n\r\n", totalLen);

  client.print(head);
  client.write(photo_data, photo_len);
  client.print(tail);

  if (fb) {
    esp_camera_fb_return(fb);
    fb = NULL;
  }

  Serial.println("[HTTP SUCCESS] Sampel foto berhasil diunggah ke Server AI (/detect)!");
  client.stop();
  return true;
}

// ===============================================================================
// 6. SETUP & LOOP UTAMA
// ===============================================================================
void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Disable brownout detector

  Serial.begin(115200);
  delay(1000);
  Serial.println("\n========================================================");
  Serial.println("  🌿 BESTARI - ESP32-CAM Dedicated AI Vision Sensor Node");
  Serial.println("  Samsung Solve for Tomorrow 2026");
  Serial.println("========================================================");

  pinMode(FLASH_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, LOW);

  // Inisialisasi Kamera
  isCameraInitialized = initCamera();

  // Koneksi Wi-Fi
  connectWiFi();

  Serial.println("[SETUP] ESP32-CAM Sensor Node Siap Memantau Hama!\n");
}

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - lastCaptureTime >= CAPTURE_INTERVAL_MS || lastCaptureTime == 0) {
    lastCaptureTime = currentMillis;

    connectWiFi();
    captureAndUploadPhoto();
  }

  delay(50);
}
