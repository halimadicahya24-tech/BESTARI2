/*
  ===============================================================================
    🌿 BESTARI - ESP32 Main Controller Board
    Samsung Solve for Tomorrow 2026
  ===============================================================================
    PERAN SISTEM:
    1. MAIN CONTROLLER & IOT GATEWAY SYSTEM
    2. BACA SENSOR: 2x Ultrasonik HC-SR04 (Level Tangki) & 1x Kelembaban Tanah (ADC1)
    3. KONTROL AKTUATOR: 3x Relay (Dinamo Pengaduk, Pompa Biopestisida, Pompa Air)
       -> Pompa Biopestisida & Pompa Air bermuara pada 1 Dual-Input Spray Nozzle.
    4. KONEKSI CLOUD: Sync telemetri (/telemetry) & Polling respon AI (/status/latest)
  ===============================================================================
*/

#include <WiFi.h>
#include <ArduinoJson.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ===============================================================================
// 1. DEFINISI PINOUT HARDWARE ESP32 DEVKIT (30-PIN)
// ===============================================================================
// Relays (Active-LOW)
#define RELAY_MIXER_PIN    23  // Relay 1 -> Dinamo Pengaduk Tangki Biopestisida
#define RELAY_BIOPEST_PIN   4  // Relay 2 -> Pompa Semprot Biopestisida (ke Nozzle)
#define RELAY_WATER_PIN    19  // Relay 3 -> Pompa Siram Air Bersih (ke Nozzle)

#define RELAY_ON   LOW
#define RELAY_OFF  HIGH

// Sensor Ultrasonik 1 (Tangki Biopestisida)
#define US1_TRIG_PIN       27
#define US1_ECHO_PIN       33

// Sensor Ultrasonik 2 (Tangki Air Bersih)
#define US2_TRIG_PIN       25
#define US2_ECHO_PIN       26

// Sensor Kelembaban Tanah (ADC1 - Safe with Wi-Fi)
#define SOIL_MOISTURE_PIN  34  // ADC1_CH6

// Dimensi Tangki (cm) untuk Perhitungan Volume & Persentase
const float TANK_HEIGHT_CM = 20.0f; // Ketinggian penuh tangki (cm)
const float TANK_CAP_ML    = 1000.0f; // Kapasitas maksimal (mL)

// ===============================================================================
// 2. KONFIGURASI WI-FI & SERVER CLOUD
// ===============================================================================
const char* WIFI_SSID     = "Wokwi-GUEST";                // Wokwi Virtual Access Point
const char* WIFI_PASSWORD = "";                         // No Password

const char* SERVER_HOST   = "halimadi.pythonanywhere.com";
const int   SERVER_PORT   = 80;                          // HTTP Port 80
const char* STATUS_PATH   = "/status/latest";
const char* TELEMETRY_PATH= "/telemetry";

const unsigned long POLL_INTERVAL_MS      = 5000;        // Polling cloud setiap 5 detik
const unsigned long MIXING_DURATION_MS     = 3000;        // Dinamo pengaduk 3 detik
const unsigned long SPRAY_BIOPESTICIDE_MS  = 4000;        // Semprot biopestisida 4 detik
const unsigned long WATER_IRRIGATION_MS    = 3000;        // Siram air tanah 3 detik

unsigned long lastPollTime = 0;

// ===============================================================================
// 3. FUNGSI MEMBACA SENSOR ULTRASONIK & SOIL MOISTURE
// ===============================================================================
float readUltrasonicDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 25000); // Timeout 25ms
  if (duration == 0) return TANK_HEIGHT_CM;     // Default jika error

  float distanceCm = duration * 0.0343f / 2.0f;
  if (distanceCm > TANK_HEIGHT_CM) distanceCm = TANK_HEIGHT_CM;
  if (distanceCm < 2.0f) distanceCm = 2.0f;
  return distanceCm;
}

void getTankLevels(float &bioPercent, float &bioVolMl, float &waterPercent, float &waterVolMl) {
  float dist1 = readUltrasonicDistance(US1_TRIG_PIN, US1_ECHO_PIN);
  float dist2 = readUltrasonicDistance(US2_TRIG_PIN, US2_ECHO_PIN);

  // Perhitungan persentase level cairan (makin kecil jarak = tangki makin penuh)
  float levelBioCm   = TANK_HEIGHT_CM - dist1;
  float levelWaterCm = TANK_HEIGHT_CM - dist2;

  if (levelBioCm < 0) levelBioCm = 0;
  if (levelWaterCm < 0) levelWaterCm = 0;

  bioPercent   = (levelBioCm / TANK_HEIGHT_CM) * 100.0f;
  waterPercent = (levelWaterCm / TANK_HEIGHT_CM) * 100.0f;

  if (bioPercent > 100.0f) bioPercent = 100.0f;
  if (waterPercent > 100.0f) waterPercent = 100.0f;

  bioVolMl   = (bioPercent / 100.0f) * TANK_CAP_ML;
  waterVolMl = (waterPercent / 100.0f) * TANK_CAP_ML;
}

int getSoilMoisturePercent() {
  int rawValue = analogRead(SOIL_MOISTURE_PIN); // ADC1_CH6 (0 - 4095)
  // Kalibrasi Potensiometer Wokwi / Sensor Kapasitif (0V - 3.3V Full Range)
  // 4095 = Kering (0%), 0 = Basah (100%)
  int percent = map(rawValue, 4095, 0, 0, 100);
  if (percent < 0) percent = 0;
  if (percent > 100) percent = 100;
  return percent;
}

// ===============================================================================
// 4. KONEKSI WI-FI & TELEMETRI CLOUD
// ===============================================================================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[WIFI] Menghubungkan ke %s...", WIFI_SSID);
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 20) {
    delay(500);
    Serial.print(".");
    attempt++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" Terhubung!");
    Serial.printf("[WIFI] IP Address Controller: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println(" Gagal terhubung, mencoba siklus berikutnya.");
  }
}

bool sendTelemetryToServer(int soilPercent, float bioPercent, float bioVolMl, float waterPercent, float waterVolMl) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClient client;
  client.setTimeout(4000);

  if (!client.connect(SERVER_HOST, SERVER_PORT)) return false;

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
  client.println("User-Agent: BESTARI-ESP32-MainController/2.0");
  client.println("Content-Type: application/json");
  client.printf("Content-Length: %d\r\n", jsonStr.length());
  client.println("Connection: close\r\n\r\n");
  client.println(jsonStr);

  Serial.println("[TELEMETRY] Data sensor ter-update di Cloud!");
  client.stop();
  return true;
}

bool fetchServerStatus(bool &threatDetected, int &ulatCount, unsigned long &customSprayMs, bool &manualPumpActive) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClient client;
  client.setTimeout(5000);

  if (!client.connect(SERVER_HOST, SERVER_PORT)) return false;

  client.printf("GET %s HTTP/1.1\r\n", STATUS_PATH);
  client.printf("Host: %s\r\n", SERVER_HOST);
  client.println("User-Agent: BESTARI-ESP32-MainController/2.0");
  client.println("Connection: close\r\n\r\n");

  unsigned long timeout = millis();
  while (client.connected() && !client.available()) {
    if (millis() - timeout > 4000) {
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
    if (response.length() > 0 && (millis() - readStart > 1000)) break;
    delay(10);
  }
  client.stop();

  int firstBrace = response.indexOf('{');
  int lastBrace  = response.lastIndexOf('}');
  if (firstBrace == -1 || lastBrace == -1 || lastBrace <= firstBrace) return false;

  String jsonBody = response.substring(firstBrace, lastBrace + 1);

  #if ARDUINOJSON_VERSION_MAJOR >= 7
    JsonDocument doc;
  #else
    StaticJsonDocument<2048> doc;
  #endif

  DeserializationError error = deserializeJson(doc, jsonBody);
  if (error) return false;

  threatDetected   = doc["pest_detected"] | (doc["threat_detected"] | false);
  ulatCount        = doc["ulat_grayak_count"] | 0;
  manualPumpActive = doc["relay_active"] | false;
  customSprayMs    = SPRAY_BIOPESTICIDE_MS;

  if (doc["config"]["spray_duration_sec"].is<int>()) {
    customSprayMs = doc["config"]["spray_duration_sec"].as<int>() * 1000;
  }

  return true;
}

// ===============================================================================
// 5. EKSEKUSI AKTUATOR SEMPROT & SIRAM (1 DUAL-INPUT NOZZLE SYSTEM)
// ===============================================================================
void executeBioPesticideSpraying(unsigned long customDurationMs = 0) {
  unsigned long sprayDuration = (customDurationMs > 0) ? customDurationMs : SPRAY_BIOPESTICIDE_MS;

  Serial.println("\n********************************************************");
  Serial.println("   [AKTUATOR] >>> EKSEKUSI MODE BIOPESTISIDA (NOZZLE) <<< ");
  Serial.println("********************************************************");

  // Step 1: Dinamo Pengaduk ON (Aduk racikan biopestisida di tangki)
  Serial.println("[AKTUATOR] Step 1: Dinamo Pengaduk ON (GPIO 23)...");
  digitalWrite(RELAY_MIXER_PIN, RELAY_ON);
  delay(MIXING_DURATION_MS);

  // Step 2: Pompa Biopestisida ON (Mengalirkan biopestisida via selang biopestisida ke Nozzle)
  Serial.printf("[AKTUATOR] Step 2: Pompa Biopestisida ON (GPIO 4) -> Nozzle selama %lu ms...\n", sprayDuration);
  digitalWrite(RELAY_BIOPEST_PIN, RELAY_ON);
  delay(sprayDuration);

  // Step 3: Matikan Seluruh Aktuator Biopestisida
  Serial.println("[AKTUATOR] Step 3: Mematikan Pompa Biopestisida & Dinamo Pengaduk...");
  digitalWrite(RELAY_BIOPEST_PIN, RELAY_OFF);
  delay(300);
  digitalWrite(RELAY_MIXER_PIN, RELAY_OFF);
  Serial.println("[AKTUATOR] >>> Selesai Menyemprot Biopestisida <<<\n");
}

void executeWaterIrrigation() {
  Serial.println("\n********************************************************");
  Serial.println("   [AKTUATOR] >>> EKSEKUSI MODE SIRAM AIR TANAH (NOZZLE) <<<");
  Serial.println("********************************************************");

  // Dinamo Mixer OFF
  digitalWrite(RELAY_MIXER_PIN, RELAY_OFF);

  // Pompa Air Bersih ON (Mengalirkan air bersih via selang air ke Nozzle)
  Serial.printf("[AKTUATOR] Pompa Air Bersih ON (GPIO 19) -> Nozzle selama %lu ms...\n", WATER_IRRIGATION_MS);
  digitalWrite(RELAY_WATER_PIN, RELAY_ON);
  delay(WATER_IRRIGATION_MS);

  // Matikan Pompa Air
  digitalWrite(RELAY_WATER_PIN, RELAY_OFF);
  Serial.println("[AKTUATOR] >>> Selesai Penyiraman Tanah <<<\n");
}

// ===============================================================================
// 6. SETUP & LOOP UTAMA
// ===============================================================================
void setup() {
  Serial.begin(115200);
  delay(500);
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Matikan brownout detector

  Serial.println("\n========================================================");
  Serial.println("  🌿 BESTARI - ESP32 Main Controller Board");
  Serial.println("  Samsung Solve for Tomorrow 2026");
  Serial.println("========================================================");

  // Inisialisasi Pin Relay (Active-LOW, Default OFF)
  digitalWrite(RELAY_MIXER_PIN,  RELAY_OFF);
  digitalWrite(RELAY_BIOPEST_PIN, RELAY_OFF);
  digitalWrite(RELAY_WATER_PIN,   RELAY_OFF);
  pinMode(RELAY_MIXER_PIN,  OUTPUT);
  pinMode(RELAY_BIOPEST_PIN, OUTPUT);
  pinMode(RELAY_WATER_PIN,   OUTPUT);

  // Inisialisasi Pin Ultrasonik
  pinMode(US1_TRIG_PIN, OUTPUT);
  pinMode(US1_ECHO_PIN, INPUT);
  pinMode(US2_TRIG_PIN, OUTPUT);
  pinMode(US2_ECHO_PIN, INPUT);

  // Inisialisasi Soil Moisture (Set ADC Attenuation 11dB untuk range 0V - 3.3V)
  analogSetPinAttenuation(SOIL_MOISTURE_PIN, ADC_11db);
  pinMode(SOIL_MOISTURE_PIN, INPUT);

  // Connect Wi-Fi
  connectWiFi();

  Serial.println("[SETUP] Controller Utama BESTARI Siap Beroperasi!\n");
}

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - lastPollTime >= POLL_INTERVAL_MS || lastPollTime == 0) {
    lastPollTime = currentMillis;

    connectWiFi();

    // 1. Baca Sensor Real-Time
    float bioPercent = 0.0f, bioVol = 0.0f, waterPercent = 0.0f, waterVol = 0.0f;
    getTankLevels(bioPercent, bioVol, waterPercent, waterVol);
    int soilMoisture = getSoilMoisturePercent();

    Serial.printf("[SENSOR] Kelembaban Tanah: %d%% | Level Biopestisida: %.1f%% (%.0f mL) | Level Air: %.1f%% (%.0f mL)\n",
                  soilMoisture, bioPercent, bioVol, waterPercent, waterVol);

    // 2. Kirim Telemetri ke Cloud
    sendTelemetryToServer(soilMoisture, bioPercent, bioVol, waterPercent, waterVol);

    // 3. Polling Status Server Cloud
    bool threatDetected   = false;
    int  ulatCount        = 0;
    unsigned long sprayMs = SPRAY_BIOPESTICIDE_MS;
    bool manualPumpActive = false;

    bool serverOk = fetchServerStatus(threatDetected, ulatCount, sprayMs, manualPumpActive);

    if (serverOk) {
      Serial.printf("[CLOUD RESPONSE] Status: %s | Hama: %d | Trigger Web: %s\n",
                    threatDetected ? "BAHAYA (Ulat Grayak)" : "AMAN",
                    ulatCount, manualPumpActive ? "AKTIF" : "OFF");
    }

    // 4. Logika Kontrol Aktuator (Priority 1: Hama/Manual, Priority 2: Tanah Kering)
    if (threatDetected || manualPumpActive) {
      executeBioPesticideSpraying(sprayMs);
    } else if (soilMoisture < 40) { // Jika kelembaban tanah di bawah 40%
      executeWaterIrrigation();
    } else {
      Serial.println("[STATUS] System Standby: Kondisi Tanaman & Tanah Ideal.\n");
    }
  }

  delay(50);
}
