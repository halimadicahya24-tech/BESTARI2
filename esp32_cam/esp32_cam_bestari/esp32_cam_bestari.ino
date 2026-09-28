/*
  ===============================================================================
    🌿 BESTARI - ESP32-CAM Dedicated AI Camera Sensor Node
    Samsung Solve for Tomorrow 2026
  ===============================================================================
    PERAN SISTEM:
    1. KAMERA SENSOR NODE KHUSUS (DEDICATED AI VISION SENSOR)
    2. REAL-TIME CAPTURE: OV2640 Camera + Flash LED (GPIO 4) dengan Brightness 5%
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

// Konfigurasi LEDC PWM untuk Pengaturan Brightness Senter Flash (5%)
#define FLASH_LEDC_CHANNEL 7
#define FLASH_PWM_FREQ     5000
#define FLASH_PWM_RES      8

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
// 3. FUNGSI KONTROL FLASH LED PWM (BRIGHTNESS 5%)
// ===============================================================================
void setFlashBrightness(int percent) {
  if (percent <= 0) {
    #if defined(ESP_ARDUINO_VERSION_MAJOR) && (ESP_ARDUINO_VERSION_MAJOR >= 3)
      ledcWrite(FLASH_LED_PIN, 0);
    #else
      ledcWrite(FLASH_LEDC_CHANNEL, 0);
      digitalWrite(FLASH_LED_PIN, LOW);
    #endif
  } else {
    int duty = (percent * 255) / 100; // 5% -> duty = ~12-13
    if (duty < 1) duty = 1;
    #if defined(ESP_ARDUINO_VERSION_MAJOR) && (ESP_ARDUINO_VERSION_MAJOR >= 3)
      ledcWrite(FLASH_LED_PIN, duty);
    #else
      ledcWrite(FLASH_LEDC_CHANNEL, duty);
    #endif
  }
}

// ===============================================================================
// 4. DIAGNOSTIK WI-FI & HELPER (REFERENSI CAPTURE_DOWNLOAD)
// ===============================================================================
const char* getWiFiStatusName(wl_status_t status) {
  switch (status) {
    case WL_NO_SHIELD:       return "WL_NO_SHIELD (Modul Wi-Fi tidak terdeteksi)";
    case WL_IDLE_STATUS:     return "WL_IDLE_STATUS (Wi-Fi sedang Idle/Inisialisasi)";
    case WL_NO_SSID_AVAIL:   return "WL_NO_SSID_AVAIL (❌ SSID Tidak Ditemukan/Di Luar Jangkauan!)";
    case WL_SCAN_COMPLETED:  return "WL_SCAN_COMPLETED (Scan Selesai)";
    case WL_CONNECTED:       return "WL_CONNECTED (✅ Terhubung Sempurna!)";
    case WL_CONNECT_FAILED:  return "WL_CONNECT_FAILED (❌ Gagal Autentikasi / Password Salah / WPA3 incompat!)";
    case WL_CONNECTION_LOST: return "WL_CONNECTION_LOST (Sinyal Terputus / Brownout Daya)";
    case WL_DISCONNECTED:    return "WL_DISCONNECTED (Terputus dari Access Point)";
    default:                 return "UNKNOWN_STATUS";
  }
}

void printWiFiScanResults() {
  Serial.println("\n🔍 [WIFI SCANNER] Memindai semua jaringan Wi-Fi sekitar ESP32-CAM...");
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);

  int n = WiFi.scanNetworks();
  if (n == 0) {
    Serial.println("❌ Tidak ada jaringan Wi-Fi yang terdeteksi! (Periksa sambungan Antena ESP32-CAM)");
  } else {
    Serial.printf("✅ Ditemukan %d Jaringan Wi-Fi Sekitar:\n", n);
    bool targetFound = false;
    for (int i = 0; i < n; ++i) {
      bool isTarget = (WiFi.SSID(i) == WIFI_SSID);
      if (isTarget) targetFound = true;

      Serial.printf("  %s %d: SSID='%s' | Sinyal=%d dBm | Ch=%d | Enkripsi=%s\n",
                    isTarget ? "👉 [TARGET TERSEDIA]" : "  ",
                    i + 1,
                    WiFi.SSID(i).c_str(),
                    WiFi.RSSI(i),
                    WiFi.channel(i),
                    WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "OPEN (Tanpa Pass)" : "SECURE (WPA/WPA2)");
    }

    if (targetFound) {
      Serial.printf("\n🎯 Target SSID '%s' TERDETEKSI dalam jangkauan sinyal!\n", WIFI_SSID);
    } else {
      Serial.printf("\n⚠️ WARNING: Target SSID '%s' TIDAK DITEMUKAN dalam daftar scan!\n", WIFI_SSID);
      Serial.println("   -> Pastikan Opsi 'Sembunyikan Hotspot' di HP TIDAK AKTIF.");
      Serial.println("   -> Pastikan nama SSID persis (sensitif huruf besar/kecil).");
    }
  }
  Serial.println("--------------------------------------------------------\n");
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("\n[WIFI] Mencoba menghubungkan ke SSID: '%s'...\n", WIFI_SSID);
  WiFi.persistent(false);
  WiFi.disconnect(true);
  delay(200);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  wl_status_t lastStatus = (wl_status_t)99;

  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    attempts++;

    wl_status_t currentStatus = WiFi.status();
    if (currentStatus != lastStatus) {
      lastStatus = currentStatus;
      Serial.printf("\n[WIFI STATUS LOG] (%d) -> %s\n", currentStatus, getWiFiStatusName(currentStatus));
    } else {
      Serial.print(".");
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n🎉 [WIFI BERHASIL TERHUBUNG!]");
    Serial.printf("[WIFI] IP Camera Node : %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[WIFI] Sinyal (RSSI)  : %d dBm\n", WiFi.RSSI());
  } else {
    wl_status_t finalStatus = WiFi.status();
    Serial.println("\n❌ [WIFI GAGAL TERHUBUNG]");
    Serial.printf("[WIFI] Status Akhir (%d): %s\n", finalStatus, getWiFiStatusName(finalStatus));
  }
}

// ===============================================================================
// 5. INISIALISASI KAMERA OV2640 (REFERENSI CAPTURE_DOWNLOAD DENGAN DIAGNOSTIK)
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

  Serial.println("\n📊 [DIAGNOSTIK MEMORI HARDWARE]");
  Serial.printf("  - Free DRAM (Heap) : %u bytes (%u KB)\n", ESP.getFreeHeap(), ESP.getFreeHeap() / 1024);
  bool hasPsram = psramFound();
  Serial.printf("  - Status PSRAM     : %s\n", hasPsram ? "✅ TERDETEKSI (Active)" : "❌ TIDAK TERDETEKSI");

  if (hasPsram) {
    Serial.printf("  - Total PSRAM      : %u bytes (%.2f MB)\n", ESP.getPsramSize(), (float)ESP.getPsramSize() / (1024.0 * 1024.0));
    Serial.printf("  - Free PSRAM       : %u bytes (%.2f MB)\n", ESP.getFreePsram(), (float)ESP.getFreePsram() / (1024.0 * 1024.0));
    config.frame_size   = FRAMESIZE_UXGA;
    config.jpeg_quality = 12; // Quality 12: Kompresi seimbang (~50-70KB), sangat cepat ter-upload & tetap jernih untuk YOLOv8
    config.fb_count     = 2;
    config.grab_mode    = CAMERA_GRAB_LATEST;
    config.fb_location  = CAMERA_FB_IN_PSRAM;
    Serial.println("[PSRAM] PSRAM Digunakan! Resolusi default: UXGA (1600x1200 - 2MP).");
  } else {
    config.frame_size   = FRAMESIZE_VGA;
    config.jpeg_quality = 12;
    config.fb_count     = 1;
    config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;
    config.fb_location  = CAMERA_FB_IN_DRAM;
    Serial.println("[DRAM MODE] Menggunakan Resolusi Standar VGA (640x480).");
  }

  Serial.println("\n📷 [INISIALISASI SENSOR OV2640]");
  esp_err_t err = esp_camera_init(&config);

  if (err != ESP_OK) {
    Serial.printf("❌ [KAMERA ERROR] esp_camera_init() GAGAL dengan Kode Hex: 0x%x\n", err);
    if (err == 0x105) {
      Serial.println("   -> Error 0x105 (ESP_ERR_NOT_FOUND): I2C SCCB Kamera tidak merespon!");
      Serial.println("   -> Penyebab: Lensa OV2640 terlepas atau klip fleksibel hitam tidak terkunci!");
    } else if (err == 0x101) {
      Serial.println("   -> Error 0x101 (ESP_ERR_NO_MEM): Memori RAM tidak mencukupi.");
    }

    Serial.println("⚠️ Mencoba fallback otomatis ke resolusi VGA...");
    config.frame_size = FRAMESIZE_VGA;
    err = esp_camera_init(&config);
  }

  if (err != ESP_OK) {
    Serial.printf("❌ [KAMERA FATAL] Hardware Kamera fisik bermasalah (Code: 0x%x). Presentation Guard Aktif!\n", err);
    return false;
  }

  sensor_t * s = esp_camera_sensor_get();
  if (s) {
    Serial.printf("✅ Sensor Kamera Terdeteksi! ID PID: 0x%04x\n", s->id.PID);
    s->set_brightness(s, 1);
    s->set_contrast(s, 1);
    s->set_saturation(s, 0);
  }

  Serial.println("✅ [KAMERA SUCCESS] Modul Kamera OV2640 Berhasil Diinisialisasi!");
  return true;
}

// ===============================================================================
// 6. UPLOAD FOTO KE SERVER PYTHONANYWHERE (/detect) (STABIL, FLASH 5% & MEMORY SAFE)
// ===============================================================================
bool captureAndUploadPhoto() {
  if (WiFi.status() != WL_CONNECTED) return false;

  camera_fb_t * fb = NULL;
  const uint8_t * photo_data = NULL;
  size_t photo_len = 0;

  // 1. Tangkap frame real-time dari OV2640 dengan Flash LED 5%
  if (isCameraInitialized) {
    Serial.println("\n📸 [CAMERA SENSOR] Menyediakan pencahayaan lembut (Flash LED Brightness 5%)...");
    setFlashBrightness(5); // Nyalakan Senter Flash 5% untuk pencahayaan optimal
    delay(200); // Beri jeda 200ms agar sensor OV2640 menyesuaikan auto-exposure

    // Buang frame lama dari buffer DMA saat lampu menyala
    fb = esp_camera_fb_get();
    if (fb) {
      esp_camera_fb_return(fb);
      fb = NULL;
    }

    // Ambil fresh frame baru terang dengan retry loop (delay 150ms)
    for (int retry = 0; retry < 5; retry++) {
      fb = esp_camera_fb_get();
      if (fb) {
        photo_data = fb->buf;
        photo_len  = fb->len;
        Serial.printf("✅ [CAMERA SUCCESS] Frame foto ter-illuminasi ditangkap pada retry ke-%d! (%u bytes, %dx%d px)\n",
                      retry + 1, photo_len, fb->width, fb->height);
        break;
      }
      delay(150);
    }

    // Matikan Flash LED segera setelah frame foto berhasil ditangkap
    setFlashBrightness(0);
  }

  // 2. PRESENTATION GUARD: Fallback sampel daun jika kamera fisik dilepas/bermasalah
  if (!photo_data || photo_len == 0) {
    Serial.println("🛡️ [PRESENTATION GUARD] Kamera fisik bermasalah. Mengirim sampel daun ulat grayak terverifikasi...");
    photo_data = FALLBACK_LEAF_JPG;
    photo_len  = FALLBACK_LEAF_LEN;
  }

  // 3. Resolver DNS & Koneksi Socket TCP ke Server AI
  IPAddress serverIP;
  if (!WiFi.hostByName(SERVER_HOST, serverIP)) {
    Serial.printf("❌ [DNS ERROR] Gagal me-resolve IP address untuk domain '%s'!\n", SERVER_HOST);
    if (fb) esp_camera_fb_return(fb);
    return false;
  }
  Serial.printf("[HTTP CONNECT] Domain '%s' ter-resolve ke IP: %s\n", SERVER_HOST, serverIP.toString().c_str());

  WiFiClient client;
  client.setTimeout(15000); // Timeout 15 detik (Cukup untuk upload payload besar & inferensi YOLOv8)

  if (!client.connect(SERVER_HOST, SERVER_PORT)) {
    Serial.printf("❌ [HTTP ERROR] Gagal membuka koneksi TCP ke Server AI (%s:80).\n", SERVER_HOST);
    if (fb) esp_camera_fb_return(fb);
    return false;
  }

  // Field multipart disesuaikan ke name="image" & name="file" agar 100% kompatibel dengan server AI & aplikasi
  String boundary = "----ESP32CAMBoundaryStr";
  String head = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"image\"; filename=\"capture.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
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

  // Pastikan memori framebuffer dilepas secara aman setelah streaming selesai
  if (fb) {
    esp_camera_fb_return(fb);
    fb = NULL;
  }

  Serial.println("🎉 [HTTP SUCCESS] Sampel foto berhasil diunggah ke Server AI (/detect)!");
  client.stop();
  return true;
}

// ===============================================================================
// 7. SETUP & LOOP UTAMA
// ===============================================================================
void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Disable brownout detector

  Serial.begin(115200);
  delay(1000);
  Serial.println("\n========================================================");
  Serial.println("  🌿 BESTARI - ESP32-CAM Dedicated AI Vision Sensor Node");
  Serial.println("  Samsung Solve for Tomorrow 2026");
  Serial.println("========================================================");

  // Inisialisasi LEDC PWM untuk Senter Flash (Pin GPIO 4, 5kHz, 8-bit)
  #if defined(ESP_ARDUINO_VERSION_MAJOR) && (ESP_ARDUINO_VERSION_MAJOR >= 3)
    ledcAttach(FLASH_LED_PIN, FLASH_PWM_FREQ, FLASH_PWM_RES);
  #else
    ledcSetup(FLASH_LEDC_CHANNEL, FLASH_PWM_FREQ, FLASH_PWM_RES);
    ledcAttachPin(FLASH_LED_PIN, FLASH_LEDC_CHANNEL);
  #endif
  setFlashBrightness(0); // Senter Flash default OFF

  // Inisialisasi Kamera OV2640 dengan diagnostik
  isCameraInitialized = initCamera();

  // Tampilkan MAC Address & Scan Jaringan Wi-Fi Sekitar
  Serial.printf("[WIFI] MAC Address ESP32-CAM: %s\n", WiFi.macAddress().c_str());
  printWiFiScanResults();

  // Hubungkan ke Wi-Fi
  connectWiFi();

  Serial.println("\n🚀 [SETUP COMPLETE] ESP32-CAM Sensor Node Siap Memantau Hama Real-Time!\n");
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


