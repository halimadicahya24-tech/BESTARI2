/*
  ===============================================================================
    BESTARI - ESP32-CAM Standalone Live Video Streamer & Snapshot Test
  ===============================================================================
    Fungsi: Menguji kualitas kamera OV2640 (Mode Stream & Single Snapshot)
            Konfigurasi khusus DRAM untuk modul tanpa PSRAM.
  ===============================================================================
*/

#include <WiFi.h>
#include "esp_camera.h"
#include "esp_http_server.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// 1. Kredensial Wi-Fi Hotspot Anda
const char* WIFI_SSID     = "mjid";
const char* WIFI_PASSWORD = "8765432111";

// 2. Pemetaan Pin AI-Thinker ESP32-CAM OV2640
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

// Header HTTP Stream MJPEG
#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace; boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY     = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART         = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

httpd_handle_t camera_httpd = NULL;

// 1. Handler Single Photo Snapshot (/capture)
static esp_err_t capture_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;

  // Ambil foto tunggal dengan retry loop jika DMA buffer sedang dalam proses penulisan
  for (int i = 0; i < 5; i++) {
    fb = esp_camera_fb_get();
    if (fb) break;
    delay(50);
  }

  if (!fb) {
    Serial.println("[CAPTURE ERROR] Gagal menangkap foto tunggal dari OV2640");
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }

  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
  esp_camera_fb_return(fb);
  Serial.println("[CAPTURE SUCCESS] Foto tunggal berhasil dikirim ke browser!");
  return res;
}

// 2. Handler HTTP Video Stream MJPEG Live (/stream)
static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;
  size_t _jpg_buf_len = 0;
  uint8_t * _jpg_buf = NULL;
  char part_buf[64];

  res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
  if (res != ESP_OK) return res;

  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("[STREAM ERROR] Frame terlewat, mencoba ulang...");
      delay(50);
      continue;
    }

    _jpg_buf_len = fb->len;
    _jpg_buf     = fb->buf;

    if (res == ESP_OK) {
      size_t hlen = snprintf(part_buf, 64, _STREAM_PART, _jpg_buf_len);
      res = httpd_resp_send_chunk(req, part_buf, hlen);
    }
    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
    }
    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
    }

    if (fb) {
      esp_camera_fb_return(fb);
      fb = NULL;
      _jpg_buf = NULL;
    }

    if (res != ESP_OK) break;
    delay(50);
  }
  return res;
}

// 3. Handler Dashboard Utama (/)
static esp_err_t index_handler(httpd_req_t *req) {
  const char* html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ESP32-CAM Test Dashboard - BESTARI</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; text-align: center; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
    .card { background-color: #1e293b; padding: 25px; max-width: 680px; margin: 20px auto; border-radius: 20px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); border: 1px solid #334155; }
    h1 { color: #38bdf8; font-size: 24px; margin-bottom: 5px; }
    p { color: #94a3b8; font-size: 14px; margin-top: 0; }
    .stream-container { margin: 20px 0; background: #000; border-radius: 14px; overflow: hidden; border: 2px solid #38bdf8; }
    img { width: 100%; height: auto; display: block; }
    .btn { display: inline-block; background-color: #0284c7; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; margin: 5px; transition: 0.2s; }
    .btn:hover { background-color: #0369a1; }
    .status-badge { display: inline-block; background-color: #10b981; color: #fff; padding: 6px 16px; border-radius: 9999px; font-size: 13px; font-weight: bold; margin-bottom: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="status-badge">● CAMERA READY</div>
    <h1>🌿 BESTARI ESP32-CAM Test Dashboard</h1>
    <p>Pengujian Kualitas Kamera OV2640 Real-Time & Snapshot</p>
    
    <div style="margin-bottom: 15px;">
      <a href="/" class="btn">📹 Live Video Stream</a>
      <a href="/capture" target="_blank" class="btn" style="background-color: #10b981;">📸 Take Single Photo</a>
    </div>

    <div class="stream-container">
      <img src="/stream" alt="ESP32-CAM Stream" id="streamView" />
    </div>
  </div>
</body>
</html>
)rawliteral";

  httpd_resp_set_type(req, "text/html");
  return httpd_resp_send(req, html, strlen(html));
}

// Inisialisasi HTTP Web Server
void startCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;

  httpd_uri_t index_uri = {
    .uri       = "/",
    .method    = HTTP_GET,
    .handler   = index_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t stream_uri = {
    .uri       = "/stream",
    .method    = HTTP_GET,
    .handler   = stream_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t capture_uri = {
    .uri       = "/capture",
    .method    = HTTP_GET,
    .handler   = capture_handler,
    .user_ctx  = NULL
  };

  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &index_uri);
    httpd_register_uri_handler(camera_httpd, &stream_uri);
    httpd_register_uri_handler(camera_httpd, &capture_uri);
    Serial.println("[SERVER] Web Server Camera Berhasil Dimulai!");
  }
}

void setup() {
  // Matikan Brownout Detector sementara untuk booting awal stabil
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  delay(1000);
  Serial.println("\n========================================================");
  Serial.println("  ESP32-CAM Standalone Live Video Streamer & Snapshot");
  Serial.println("========================================================");

  // Inisialisasi Konfigurasi Kamera OV2640 (Mode Synchronous DRAM)
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

  // XCLK 20MHz (Standar OV2640 untuk rate 15-20 fps)
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    Serial.println("[PSRAM] PSRAM Terdeteksi (4MB Aktif)! Menggunakan Resolusi VGA.");
    config.frame_size   = FRAMESIZE_VGA;
    config.jpeg_quality = 10;
    config.fb_count     = 2;
    config.grab_mode    = CAMERA_GRAB_LATEST;
  } else {
    Serial.println("[PSRAM WARN] PSRAM Disabled di Arduino IDE. Menggunakan Mode DRAM.");
    config.frame_size   = FRAMESIZE_QVGA;
    config.jpeg_quality = 12;
    config.fb_count     = 1;
    config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;
  }

  // Inisialisasi Hardware Kamera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[KAMERA ERROR] Gagal inisialisasi modul kamera. Code: 0x%x\n", err);
    return;
  }
  Serial.println("[KAMERA SUCCESS] Modul Kamera OV2640 Berhasil Diinisialisasi!");

  // Koneksi Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WIFI] Menghubungkan ke ");
  Serial.print(WIFI_SSID);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n[WIFI] Terhubung Berhasil!");
  Serial.print("[WIFI] Alamat IP ESP32-CAM: http://");
  Serial.println(WiFi.localIP());

  // Jalankan Web Server Streaming & Capture
  startCameraServer();

  Serial.println("\n========================================================");
  Serial.println("  AKSES UJI COBA KAMERA DI BROWSER HP / LAPTOP ANDA:");
  Serial.printf("  👉 Dashboard Live:  http://%s/\n", WiFi.localIP().toString().c_str());
  Serial.printf("  👉 Foto Snapshot:   http://%s/capture\n", WiFi.localIP().toString().c_str());
  Serial.println("========================================================\n");
}

void loop() {
  delay(10000);
}
