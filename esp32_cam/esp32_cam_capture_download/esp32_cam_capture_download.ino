/*
  ===============================================================================
    🌿 BESTARI - ESP32-CAM High Resolution Photo Capture & Downloader
    Samsung Solve for Tomorrow 2026
  ===============================================================================
    FUNGSI UTAMA:
    1. Web Dashboard langsung di IP ESP32-CAM (akses dari Laptop / Browser HP)
    2. Pilihan Resolusi Tinggi: UXGA (1600x1200), SXGA (1280x1024), XGA, SVGA, VGA
    3. Pengaturan Kualitas JPEG (Quality 10 = Kualitas Tertinggi)
    4. Kontrol Senter Flash LED Onboard (GPIO 4)
    5. Tombol 1-Click Download (.jpg) langsung tersimpan di folder Downloads Laptop
  ===============================================================================
*/

#include <WiFi.h>
#include "esp_camera.h"
#include "esp_http_server.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ===============================================================================
// 1. KREDENSIAL WI-FI (Sesuaikan dengan SSID & Password Hotspot / Wi-Fi Anda)
// ===============================================================================
const char* WIFI_SSID     = "mjid";         // Ubah ke nama Wi-Fi / Hotspot Anda
const char* WIFI_PASSWORD = "8765432111";   // Ubah ke password Wi-Fi Anda

// ===============================================================================
// 2. PEMETAAN PIN HARDWARE AI-THINKER ESP32-CAM OV2640
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
#define FLASH_LED_PIN      4

// Header Stream MJPEG
#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace; boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY     = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART         = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

httpd_handle_t camera_httpd = NULL;
bool flashState = false;

// ===============================================================================
// 3. INDEX HTML WEB DASHBOARD (DENGAN TAMPILAN MODERN & TOMBOL DOWNLOAD)
// ===============================================================================
static const char PROGMEM INDEX_HTML[] = R"rawliteral(
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🌿 BESTARI ESP32-CAM Downloader</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    body { background-color: #0f172a; color: #f8fafc; display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding: 20px; }
    .container { max-width: 900px; width: 100%; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    header { text-align: center; margin-bottom: 20px; }
    h1 { color: #38bdf8; font-size: 24px; font-weight: 700; margin-bottom: 6px; display: flex; align-items: center; justify-content: center; gap: 10px; }
    p.subtitle { color: #94a3b8; font-size: 13px; }
    .controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px; background: #0f172a; padding: 16px; border-radius: 12px; border: 1px solid #334155; }
    .control-group { display: flex; flex-direction: column; gap: 6px; }
    label { font-size: 12px; font-weight: 600; color: #cbd5e1; }
    select, button { padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; outline: none; border: none; cursor: pointer; transition: all 0.2s; }
    select { background-color: #1e293b; color: #f8fafc; border: 1px solid #475569; }
    select:focus { border-color: #38bdf8; }
    .btn-primary { background-color: #0284c7; color: white; }
    .btn-primary:hover { background-color: #0369a1; transform: translateY(-1px); }
    .btn-success { background-color: #16a34a; color: white; }
    .btn-success:hover { background-color: #15803d; transform: translateY(-1px); }
    .btn-warning { background-color: #d97706; color: white; }
    .btn-warning:hover { background-color: #b45309; }
    .btn-group { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
    .preview-box { width: 100%; min-height: 350px; background-color: #020617; border-radius: 12px; border: 2px dashed #334155; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
    .preview-box img { max-width: 100%; max-height: 600px; object-fit: contain; border-radius: 8px; }
    .meta-bar { margin-top: 14px; padding: 12px 16px; background-color: #0f172a; border-radius: 8px; font-size: 12px; color: #94a3b8; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
    .badge { padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; }
    .badge-blue { background: #0284c7; color: white; }
    .badge-green { background: #16a34a; color: white; }
    .loading { display: none; color: #38bdf8; font-weight: bold; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🌿 BESTARI ESP32-CAM High-Res Downloader</h1>
      <p class="subtitle">Ambil foto kualitas tinggi (UXGA 1600x1200) untuk penelitian & pengujian sampel daun</p>
    </header>

    <div class="controls">
      <div class="control-group">
        <label for="res">Resolusi Foto (Framesize)</label>
        <select id="res" onchange="changeResolution(this.value)">
          <option value="10" selected>UXGA (1600x1200 - HD 2MP)</option>
          <option value="9">SXGA (1280x1024)</option>
          <option value="8">XGA (1024x768)</option>
          <option value="7">SVGA (800x600)</option>
          <option value="6">VGA (640x480)</option>
          <option value="5">CIF (400x296)</option>
        </select>
      </div>

      <div class="control-group">
        <label for="quality">Kualitas JPEG (10 = Terbaik, 30 = Kompresi)</label>
        <select id="quality" onchange="changeQuality(this.value)">
          <option value="10" selected>Quality 10 (Jernih & Detail)</option>
          <option value="15">Quality 15 (Sedang)</option>
          <option value="20">Quality 20 (Ringan)</option>
        </select>
      </div>
    </div>

    <div class="btn-group">
      <button class="btn-primary" onclick="capturePhoto()">📸 Ambil Foto (Take Photo)</button>
      <button class="btn-success" id="btnDownload" onclick="downloadPhoto()" disabled>💾 Download Foto (.jpg)</button>
      <button class="btn-warning" id="btnFlash" onclick="toggleFlash()">💡 Senter Flash: OFF</button>
      <button style="background-color: #475569; color: white;" onclick="toggleStream()">📹 Live Stream</button>
    </div>

    <div class="preview-box">
      <span class="loading" id="loadingText">⏳ Tekan 'Ambil Foto' untuk memulai jepretan...</span>
      <img id="photoPreview" alt="Tampilan Foto ESP32-CAM" style="display:none;">
    </div>

    <div class="meta-bar">
      <span>Status: <span id="statusBadge" class="badge badge-blue">Ready</span></span>
      <span>Ukuran File: <strong id="fileSize">- KB</strong></span>
      <span>Resolusi: <strong id="resInfo">UXGA (1600x1200)</strong></span>
      <span>Timestamp: <strong id="timeInfo">-</strong></span>
    </div>
  </div>

  <script>
    let currentBlobUrl = null;
    let flashOn = false;
    let isStreaming = false;

    async function capturePhoto() {
      const img = document.getElementById('photoPreview');
      const loading = document.getElementById('loadingText');
      const status = document.getElementById('statusBadge');
      const btnDownload = document.getElementById('btnDownload');
      const timeInfo = document.getElementById('timeInfo');
      const fileSize = document.getElementById('fileSize');

      if (isStreaming) toggleStream();

      loading.innerText = '⏳ Mengambil foto dari ESP32-CAM (UXGA HD)...';
      loading.style.display = 'block';
      img.style.display = 'none';
      status.innerText = 'Capturing...';
      status.className = 'badge badge-blue';

      try {
        const timestamp = new Date().getTime();
        // Cukup 1x HTTP request saja (Mencegah konflik double-request di ESP32)
        const res = await fetch('/capture?t=' + timestamp);
        if (!res.ok) throw new Error('HTTP status ' + res.status);

        const blob = await res.blob();
        if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = URL.createObjectURL(blob);

        img.src = currentBlobUrl;
        img.onload = () => {
          loading.style.display = 'none';
          img.style.display = 'block';
          status.innerText = 'Foto Berhasil Ditangkap!';
          status.className = 'badge badge-green';
          btnDownload.disabled = false;

          const kb = (blob.size / 1024).toFixed(1);
          fileSize.innerText = kb + ' KB';
          timeInfo.innerText = new Date().toLocaleTimeString('id-ID');
        };
      } catch (err) {
        console.error('Capture Error:', err);
        loading.innerText = '❌ Gagal menangkap foto. Coba klik Ambil Foto kembali.';
        loading.style.display = 'block';
        img.style.display = 'none';
        status.innerText = 'Error';
        status.className = 'badge badge-red';
      }
    }

    function downloadPhoto() {
      if (!currentBlobUrl) return;
      const timeStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `bestari_esp32cam_${timeStr}.jpg`;

      // Download langsung dari Blob URL yang sudah ada di memori browser
      const link = document.createElement('a');
      link.href = currentBlobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    function toggleFlash() {
      flashOn = !flashOn;
      const btn = document.getElementById('btnFlash');
      fetch('/flash?state=' + (flashOn ? 'on' : 'off'))
        .then(() => {
          btn.innerText = flashOn ? '💡 Senter Flash: ON' : '💡 Senter Flash: OFF';
          btn.style.backgroundColor = flashOn ? '#eab308' : '#d97706';
        });
    }

    function changeResolution(val) {
      const resMap = {
        '10': 'UXGA (1600x1200)', '9': 'SXGA (1280x1024)', '8': 'XGA (1024x768)',
        '7': 'SVGA (800x600)', '6': 'VGA (640x480)', '5': 'CIF (400x296)'
      };
      document.getElementById('resInfo').innerText = resMap[val] || val;
      fetch('/control?var=framesize&val=' + val).then(() => setTimeout(capturePhoto, 300));
    }

    function changeQuality(val) {
      fetch('/control?var=quality&val=' + val);
    }

    function toggleStream() {
      const img = document.getElementById('photoPreview');
      const loading = document.getElementById('loadingText');
      if (!isStreaming) {
        loading.style.display = 'none';
        img.style.display = 'block';
        img.src = '/stream';
        isStreaming = true;
      } else {
        img.src = '';
        isStreaming = false;
        capturePhoto();
      }
    }

    // Auto-capture foto pertama saat halaman dibuka
    window.addEventListener('load', () => {
      setTimeout(capturePhoto, 500);
    });
  </script>
</body>
</html>
)rawliteral";

// ===============================================================================
// 4. HTTP SERVER HANDLERS
// ===============================================================================

// Handler Index (Web Dashboard)
static esp_err_t index_handler(httpd_req_t *req) {
  httpd_resp_set_type(req, "text/html");
  return httpd_resp_send(req, INDEX_HTML, strlen(INDEX_HTML));
}

// Handler Single Capture (Preview Foto Inline)
static esp_err_t capture_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;

  Serial.println("\n📸 [CAPTURE REQUEST] Memproses permintaan jepret foto...");
  Serial.printf("  - Free Heap DRAM  : %u bytes (%u KB)\n", ESP.getFreeHeap(), ESP.getFreeHeap() / 1024);
  if (psramFound()) {
    Serial.printf("  - Free PSRAM      : %u bytes (%.2f MB)\n", ESP.getFreePsram(), (float)ESP.getFreePsram() / (1024.0 * 1024.0));
  }

  // 1. Buang (flush) frame lama dari buffer DMA
  fb = esp_camera_fb_get();
  if (fb) {
    Serial.printf("  - Flushed frame buffer lama (%u bytes)\n", fb->len);
    esp_camera_fb_return(fb);
    fb = NULL;
  }

  // 2. Ambil frame foto fresh baru dengan retry loop
  for (int i = 0; i < 5; i++) {
    fb = esp_camera_fb_get();
    if (fb) {
      Serial.printf("  ✅ Success jepret foto pada percobaan ke-%d!\n", i + 1);
      Serial.printf("  - Dimensions : %d x %d px\n", fb->width, fb->height);
      Serial.printf("  - Format     : %d (JPEG)\n", fb->format);
      Serial.printf("  - File Size  : %u bytes (%.1f KB)\n", fb->len, (float)fb->len / 1024.0);
      break;
    }
    Serial.printf("  ⚠️ Percobaan ke-%d: esp_camera_fb_get() mengembalikan NULL, retrying...\n", i + 1);
    delay(150);
  }

  if (!fb) {
    Serial.println("❌ [CAPTURE ERROR] esp_camera_fb_get() tetap NULL setelah 5x percobaan!");
    Serial.println("   -> Kemungkinan Penyebab: Sinyal XCLK Jitter / Kabel Pita Kamera Terlepas / Pasokan 5V Drop.");
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }

  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=bestari_photo.jpg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
  esp_camera_fb_return(fb);
  Serial.println("✅ [CAPTURE FINISHED] Foto berhasil dikirimkan ke browser!");
  return res;
}

// Handler Force Download (1-Click Download JPG langsung tersimpan di Laptop)
static esp_err_t download_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;

  Serial.println("\n💾 [DOWNLOAD REQUEST] Memproses permintaan download foto...");

  // Flush buffer lama
  fb = esp_camera_fb_get();
  if (fb) {
    esp_camera_fb_return(fb);
    fb = NULL;
  }

  for (int i = 0; i < 5; i++) {
    fb = esp_camera_fb_get();
    if (fb) break;
    delay(150);
  }

  if (!fb) {
    Serial.println("❌ [DOWNLOAD ERROR] esp_camera_fb_get() mengembalikan NULL!");
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }

  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Content-Disposition", "attachment; filename=bestari_esp32cam_highres.jpg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
  esp_camera_fb_return(fb);
  Serial.printf("✅ [DOWNLOAD FINISHED] File JPG berhasil didownload (%u bytes)\n", fb->len);
  return res;
}

// Handler Control Flash LED Onboard (GPIO 4)
static esp_err_t flash_handler(httpd_req_t *req) {
  char buf[32];
  if (httpd_req_get_url_query_str(req, buf, sizeof(buf)) == ESP_OK) {
    char value[10];
    if (httpd_query_key_value(buf, "state", value, sizeof(value)) == ESP_OK) {
      if (strcmp(value, "on") == 0) {
        digitalWrite(FLASH_LED_PIN, HIGH);
        flashState = true;
        Serial.println("[FLASH] Senter LED ON");
      } else {
        digitalWrite(FLASH_LED_PIN, LOW);
        flashState = false;
        Serial.println("[FLASH] Senter LED OFF");
      }
    }
  }
  httpd_resp_set_type(req, "text/plain");
  return httpd_resp_send(req, "OK", 2);
}

// Handler Control Settings Kamera (Framesize & Quality)
static esp_err_t control_handler(httpd_req_t *req) {
  char buf[64];
  if (httpd_req_get_url_query_str(req, buf, sizeof(buf)) == ESP_OK) {
    char var[16], val[16];
    if (httpd_query_key_value(buf, "var", var, sizeof(var)) == ESP_OK &&
        httpd_query_key_value(buf, "val", val, sizeof(val)) == ESP_OK) {
      
      sensor_t * s = esp_camera_sensor_get();
      int val_int = atoi(val);

      if (strcmp(var, "framesize") == 0) {
        if (s->pixformat == PIXFORMAT_JPEG) {
          s->set_framesize(s, (framesize_t)val_int);
          Serial.printf("[CONTROL] Resolution diset ke framesize: %d\n", val_int);
        }
      } else if (strcmp(var, "quality") == 0) {
        s->set_quality(s, val_int);
        Serial.printf("[CONTROL] Quality diset ke: %d\n", val_int);
      }
    }
  }
  httpd_resp_set_type(req, "text/plain");
  return httpd_resp_send(req, "OK", 2);
}

// Handler Live Video Stream MJPEG
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

    esp_camera_fb_return(fb);
    if (res != ESP_OK) break;
    delay(10);
  }

  return res;
}

// ===============================================================================
// 5. START WEB SERVER
// ===============================================================================
void startCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;
  config.stack_size = 10240;
  config.max_uri_handlers = 8;

  httpd_uri_t index_uri = {
    .uri       = "/",
    .method    = HTTP_GET,
    .handler   = index_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t capture_uri = {
    .uri       = "/capture",
    .method    = HTTP_GET,
    .handler   = capture_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t download_uri = {
    .uri       = "/download",
    .method    = HTTP_GET,
    .handler   = download_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t flash_uri = {
    .uri       = "/flash",
    .method    = HTTP_GET,
    .handler   = flash_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t control_uri = {
    .uri       = "/control",
    .method    = HTTP_GET,
    .handler   = control_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t stream_uri = {
    .uri       = "/stream",
    .method    = HTTP_GET,
    .handler   = stream_handler,
    .user_ctx  = NULL
  };

  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &index_uri);
    httpd_register_uri_handler(camera_httpd, &capture_uri);
    httpd_register_uri_handler(camera_httpd, &download_uri);
    httpd_register_uri_handler(camera_httpd, &flash_uri);
    httpd_register_uri_handler(camera_httpd, &control_uri);
    httpd_register_uri_handler(camera_httpd, &stream_uri);
    Serial.println("[SERVER] Web Downloader Server Aktif di Port 80!");
  }
}

// ===============================================================================
// 6. DIAGNOSTIK WI-FI LENGKAP & SCANNER
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

// ===============================================================================
// 7. SETUP & LOOP UTAMA
// ===============================================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Matikan brownout detector

  pinMode(FLASH_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, LOW);

  Serial.println("\n========================================================");
  Serial.println("  🌿 BESTARI - ESP32-CAM High-Res Photo Downloader");
  Serial.println("========================================================");

  // Konfigurasi Kamera OV2640
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
  config.xclk_freq_hz = 16000000; // 16 MHz untuk stabilitas transfer data kamera
  config.pixel_format = PIXFORMAT_JPEG;

  // Diagnostik Hardware Memori DRAM & PSRAM
  Serial.println("\n📊 [DIAGNOSTIK MEMORI HARDWARE]");
  Serial.printf("  - Free DRAM (Heap) : %u bytes (%u KB)\n", ESP.getFreeHeap(), ESP.getFreeHeap() / 1024);
  bool hasPsram = psramFound();
  Serial.printf("  - Status PSRAM     : %s\n", hasPsram ? "✅ TERDETEKSI (Active)" : "❌ TIDAK TERDETEKSI");
  if (hasPsram) {
    Serial.printf("  - Total PSRAM      : %u bytes (%.2f MB)\n", ESP.getPsramSize(), (float)ESP.getPsramSize() / (1024.0 * 1024.0));
    Serial.printf("  - Free PSRAM       : %u bytes (%.2f MB)\n", ESP.getFreePsram(), (float)ESP.getFreePsram() / (1024.0 * 1024.0));
  }

  if (hasPsram) {
    config.frame_size = FRAMESIZE_UXGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
    config.grab_mode = CAMERA_GRAB_LATEST;
    config.fb_location = CAMERA_FB_IN_PSRAM;
    Serial.println("\n[INFO] PSRAM Digunakan! Resolusi default: UXGA (1600x1200 - 2MP).");
  } else {
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
    config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
    config.fb_location = CAMERA_FB_IN_DRAM;
    Serial.println("\n[INFO] PSRAM Tidak Aktif. Resolusi default: VGA (640x480).");
  }

  Serial.println("\n📷 [INISIALISASI SENSOR OV2640]");
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ [ERROR CRITICAL] esp_camera_init() GAGAL dengan Kode Hex: 0x%x\n", err);
    if (err == 0x105) {
      Serial.println("   -> Error 0x105 (ESP_ERR_NOT_FOUND): I2C SCCB Kamera tidak merespon!");
      Serial.println("   -> Penyebab: Lensa OV2640 terlepas atau klip fleksibel hitam tidak terkunci!");
    } else if (err == 0x101) {
      Serial.println("   -> Error 0x101 (ESP_ERR_NO_MEM): Memori RAM tidak mencukupi untuk framebuffer.");
    }
    return;
  }
  Serial.println("✅ esp_camera_init() BERHASIL!");

  sensor_t * s = esp_camera_sensor_get();
  if (s) {
    Serial.printf("✅ Sensor Kamera Terdeteksi! ID PID: 0x%04x\n", s->id.PID);
    s->set_brightness(s, 1);
    s->set_contrast(s, 1);
    s->set_saturation(s, 0);
  } else {
    Serial.println("⚠️ Warning: esp_camera_sensor_get() mengembalikan NULL!");
  }

  // 1. Tampilkan Informasi Hardware Wi-Fi
  Serial.printf("[WIFI] ESP32-CAM MAC Address: %s\n", WiFi.macAddress().c_str());

  // 2. Jalankan Wi-Fi Scanner Diagnostik
  printWiFiScanResults();

  // 3. Hubungkan ke Wi-Fi dengan Log Diagnostik Perubahan Status
  Serial.printf("[WIFI] Mencoba menghubungkan ke SSID: '%s' (Pass: '%s')...\n", WIFI_SSID, WIFI_PASSWORD);
  WiFi.persistent(false);
  WiFi.disconnect(true);
  delay(200);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  wl_status_t lastStatus = (wl_status_t)99;

  while (WiFi.status() != WL_CONNECTED && attempts < 50) {
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
    Serial.printf("IP Address ESP32-CAM: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("Kekuatan Sinyal (RSSI): %d dBm\n", WiFi.RSSI());
    Serial.println("--------------------------------------------------------");
    Serial.print("  🌐 BUKA URL INI DI BROWSER LAPTOP ANDA:\n  👉 http://");
    Serial.println(WiFi.localIP());
    Serial.println("--------------------------------------------------------\n");

    startCameraServer();
  } else {
    wl_status_t finalStatus = WiFi.status();
    Serial.println("\n\n❌ [WIFI GAGAL TERHUBUNG]");
    Serial.printf("Status Akhir (%d): %s\n", finalStatus, getWiFiStatusName(finalStatus));
    Serial.println("========================================================");
    Serial.println("PANDUAN SOLUSI BERDASARKAN HASIL DIAGNOSTIK:");
    Serial.println("1. Jika WL_NO_SSID_AVAIL: Hotspot HP belum terdeteksi. Matikan & hidupkan kembali Hotspot HP.");
    Serial.println("2. Jika WL_CONNECT_FAILED: Password salah ATAU Hotspot menggunakan WPA3.");
    Serial.println("   -> Di HP: Ubah Keamanan Hotspot dari 'WPA3' menjadi 'WPA2-Personal'.");
    Serial.println("3. Jika WL_CONNECTION_LOST / Resets: Pasokan daya 5V kurang stabil (gunakan 5V 2A).");
    Serial.println("========================================================\n");
  }
}

void loop() {
  delay(10000); // Server berjalan secara asynchronous di background HTTPD task
}
