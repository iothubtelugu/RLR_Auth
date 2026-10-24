/**
 * ============================================================================
 * Robotics Lab of RKV (RLR) — Smart Biometric Entry & Attendance Management
 * ESP32 Standalone Optical Fingerprint Access Node
 * ============================================================================
 * 
 * Hardware Configuration:
 *   - ESP32 Dev Module (NodeMCU-32S / ESP-WROOM-32)
 *   - Optical Fingerprint Sensor Module (R307 / AS608 / FPM10A)
 *   - Blue Status LED (GPIO 21) & Red Error LED (GPIO 22)
 *   - Piezo Buzzer (GPIO 19)
 *   - Push Button 1 (GPIO 18: Manual Scan / Health Ping)
 *   - Push Button 2 (GPIO 23: Hold 3s for Quick Enrollment)
 * 
 * Target Hotspot / Wi-Fi Network:
 *   - SSID:     "Redmi 13 5G"
 *   - Password: "12345678"
 *   - Server:   http://10.206.84.110:3001
 * 
 * Required Libraries (Install via Arduino Library Manager):
 *   1. "Adafruit Fingerprint Sensor Library" by Adafruit
 *   2. "ArduinoJson" by Benoit Blanchon (v6 or v7)
 * 
 * Author: Robotics Lab of RKV Engineering Team
 * License: MIT
 * ============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_Fingerprint.h>
#include <ArduinoJson.h>

// ============================================================================
// 1. WI-FI & BACKEND SERVER CONFIGURATION
// ============================================================================
#define WIFI_SSID           "Redmi 13 5G"          // Mobile Hotspot Wi-Fi SSID
#define WIFI_PASSWORD       "12345678"             // Mobile Hotspot Wi-Fi Password

// Laptop LAN IP Address on the Redmi 13 5G Hotspot
#define SERVER_HOST         "10.206.84.110"
#define SERVER_PORT         3001

// REST API Endpoints
#define API_SCAN_PATH       "/api/attendance/scan"
#define API_HEARTBEAT_PATH  "/api/devices/heartbeat"

// Device Identity
#define DEVICE_ID           "dev-rlr-esp32-01"
#define DEVICE_NAME         "RLR Door Access Node (ESP32 + R307)"
#define FIRMWARE_VERSION    "v1.2.0-esp32"

// ============================================================================
// 2. HARDWARE PIN DEFINITIONS (ESP32)
// ============================================================================
// Optical Fingerprint Sensor (Hardware UART2)
// Connect Sensor TXD (Yellow/Green) to ESP32 RX2 (GPIO 16)
// Connect Sensor RXD (White/Blue)   to ESP32 TX2 (GPIO 17)
#define FP_RX_PIN           16   // ESP32 RX2 <-- R307/AS608 TX
#define FP_TX_PIN           17   // ESP32 TX2 --> R307/AS608 RX

// Visual Feedback LEDs
#define LED_BLUE_PIN        21   // Ready / Success indicator (Active HIGH)
#define LED_RED_PIN         22   // Error / Denied / Cooldown indicator (Active HIGH)

// Auditory Feedback Buzzer
#define BUZZER_PIN          19   // Active or Passive Piezo Buzzer (Active HIGH)
#define IS_PASSIVE_BUZZER   false // Set true if using passive piezo with tone()

// Push Buttons (Active LOW with internal INPUT_PULLUP)
#define BTN_SCAN_PIN        18   // Push Button 1: Force Scan / Manual Health Check
#define BTN_ENROLL_PIN      23   // Push Button 2: Hold 3s to enter Enrollment Mode

// ============================================================================
// 3. FINGERPRINT & CREDENTIAL MAPPING SETTINGS
// ============================================================================
#define FP_BAUD_RATE        57600   // Optical Sensor default factory baud rate
#define DEBUG_BAUD_RATE     115200  // Serial monitor debug baud rate

// Credential Reference Prefix Format
// Maps sensor flash Slot 1 -> "FP-RLR-2024-001" (matches student database)
#define CREDENTIAL_PREFIX   "FP-RLR-2024-"
#define MEMBER_ID_PREFIX    "RLR-2024-"

// Timing Constants
#define HEARTBEAT_INTERVAL_MS   30000   // Send status ping to server every 30s
#define SENSOR_POLL_INTERVAL_MS 150     // Polling delay between fingerprint queries
#define BTN_LONG_PRESS_MS       3000    // Hold Button 2 for 3s to trigger enrollment
#define HTTP_TIMEOUT_MS         5000    // HTTP request timeout

// ============================================================================
// 4. GLOBAL OBJECTS & STATE
// ============================================================================
HardwareSerial fpSerial(2); // ESP32 Hardware UART2
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fpSerial);

bool sensorConnected = false;
unsigned long lastHeartbeatTime = 0;
unsigned long lastScanTime = 0;
unsigned long btnEnrollPressStart = 0;
bool btnEnrollHolding = false;

// ============================================================================
// 5. AUDIO-VISUAL FEEDBACK HELPERS
// ============================================================================
void playBeep(int durationMs, int frequencyHz = 2400) {
  #if IS_PASSIVE_BUZZER
    ledcAttachPin(BUZZER_PIN, 0);
    ledcWriteTone(0, frequencyHz);
    delay(durationMs);
    ledcWriteTone(0, 0);
  #else
    digitalWrite(BUZZER_PIN, HIGH);
    delay(durationMs);
    digitalWrite(BUZZER_PIN, LOW);
  #endif
}

void playChimeWelcome() {
  playBeep(60, 1800);
  delay(40);
  playBeep(80, 2400);
  delay(40);
  playBeep(120, 3000);
}

void playSuccessEntry() {
  // Pleasant double-beep for ENTRY
  digitalWrite(LED_BLUE_PIN, HIGH);
  playBeep(90, 2200);
  delay(60);
  playBeep(120, 2800);
  delay(2000);
  digitalWrite(LED_BLUE_PIN, LOW);
}

void playSuccessExit() {
  // Triple-beep for EXIT
  digitalWrite(LED_BLUE_PIN, HIGH);
  playBeep(80, 2000);
  delay(50);
  playBeep(80, 2400);
  delay(50);
  playBeep(120, 2000);
  delay(2000);
  digitalWrite(LED_BLUE_PIN, LOW);
}

void playDeniedTone() {
  // Access Denied: 3 Red LED blinks + error buzzes
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_RED_PIN, HIGH);
    playBeep(120, 800);
    digitalWrite(LED_RED_PIN, LOW);
    delay(80);
  }
}

void playCooldownTone() {
  // Cooldown Warning: 2 short warning buzzes
  for (int i = 0; i < 2; i++) {
    digitalWrite(LED_RED_PIN, HIGH);
    playBeep(70, 1200);
    digitalWrite(LED_RED_PIN, LOW);
    delay(60);
  }
}

void playNetworkErrorTone() {
  digitalWrite(LED_RED_PIN, HIGH);
  playBeep(400, 600);
  digitalWrite(LED_RED_PIN, LOW);
}

// ============================================================================
// 6. WI-FI CONNECTION MANAGER
// ============================================================================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println(F("\n[Wi-Fi] Connecting to network..."));
  Serial.print(F("[Wi-Fi] SSID: "));
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttemptTime = millis();
  // 15 seconds timeout
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 15000) {
    digitalWrite(LED_BLUE_PIN, !digitalRead(LED_BLUE_PIN));
    delay(250);
    Serial.print(F("."));
  }
  digitalWrite(LED_BLUE_PIN, LOW);

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n[Wi-Fi] Connected successfully!"));
    Serial.print(F("[Wi-Fi] ESP32 IP Address: "));
    Serial.println(WiFi.localIP());
    Serial.print(F("[Wi-Fi] RSSI Signal: "));
    Serial.print(WiFi.RSSI());
    Serial.println(F(" dBm"));
    playBeep(100, 2500);
  } else {
    Serial.println(F("\n[Wi-Fi] Connection failed! Will retry in background."));
    playDeniedTone();
  }
}

// ============================================================================
// 7. FINGERPRINT SENSOR INITIALIZATION & HEALTH
// ============================================================================
bool initFingerprintSensor() {
  Serial.println(F("\n[Fingerprint] Initializing R307/AS608 Optical Sensor..."));
  
  // Start HardwareSerial2 at 57600 baud
  fpSerial.begin(FP_BAUD_RATE, SERIAL_8N1, FP_RX_PIN, FP_TX_PIN);
  finger.begin(FP_BAUD_RATE);
  delay(100);

  if (finger.verifyPassword()) {
    sensorConnected = true;
    Serial.println(F("[Fingerprint] Optical sensor handshake verified OK!"));

    finger.getParameters();
    Serial.print(F("[Fingerprint] Status Reg: 0x")); Serial.println(finger.status_reg, HEX);
    Serial.print(F("[Fingerprint] Sensor Capacity: ")); Serial.print(finger.capacity); Serial.println(F(" templates"));
    Serial.print(F("[Fingerprint] Security Level: ")); Serial.println(finger.security_level);

    finger.getTemplateCount();
    Serial.print(F("[Fingerprint] Stored Fingerprints: "));
    Serial.println(finger.templateCount);

    return true;
  } else {
    sensorConnected = false;
    Serial.println(F("[Fingerprint] ERROR: Did not find fingerprint sensor!"));
    Serial.println(F("  -> Check 5V power supply: Sensor Red wire must be on VIN / 5V"));
    Serial.println(F("  -> Check RX/TX: Try swapping GPIO 16 (RX2) and GPIO 17 (TX2)"));
    return false;
  }
}

// ============================================================================
// 8. REST API: SEND ATTENDANCE SCAN OVER WI-FI
// ============================================================================
void sendAttendanceScan(uint16_t slotId, uint16_t confidence) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[HTTP] Error: Wi-Fi not connected. Cannot send scan."));
    playNetworkErrorTone();
    connectWiFi();
    return;
  }

  HTTPClient http;
  String url = String("http://") + SERVER_HOST + ":" + SERVER_PORT + API_SCAN_PATH;

  Serial.println(F("\n--------------------------------------------------"));
  Serial.print(F("[HTTP] Sending scan to: "));
  Serial.println(url);

  // Format Opaque Token (e.g. FP-RLR-2024-001) and Member ID (e.g. RLR-2024-001)
  char credRef[32];
  char memberId[32];
  snprintf(credRef, sizeof(credRef), "%s%03d", CREDENTIAL_PREFIX, slotId);
  snprintf(memberId, sizeof(memberId), "%s%03d", MEMBER_ID_PREFIX, slotId);

  // Construct JSON Payload (compatible with ArduinoJson v6 and v7)
  #if ARDUINOJSON_VERSION_MAJOR >= 7
    JsonDocument doc;
  #else
    StaticJsonDocument<512> doc;
  #endif

  doc["credentialReference"] = credRef;
  doc["memberId"] = memberId;
  doc["verificationSource"] = "FINGERPRINT_HARDWARE";
  doc["deviceId"] = DEVICE_ID;
  doc["rawMetadata"]["slotId"] = slotId;
  doc["rawMetadata"]["confidenceScore"] = confidence;
  doc["rawMetadata"]["wifiRssi"] = WiFi.RSSI();
  doc["rawMetadata"]["firmware"] = FIRMWARE_VERSION;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.print(F("[HTTP] Payload: "));
  Serial.println(jsonPayload);

  http.begin(url);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");

  // Indicate processing with pulsing Blue LED
  digitalWrite(LED_BLUE_PIN, HIGH);
  int httpCode = http.POST(jsonPayload);
  digitalWrite(LED_BLUE_PIN, LOW);

  Serial.print(F("[HTTP] Response Code: "));
  Serial.println(httpCode);

  if (httpCode > 0) {
    String responseString = http.getString();
    Serial.print(F("[HTTP] Response: "));
    Serial.println(responseString);

    #if ARDUINOJSON_VERSION_MAJOR >= 7
      JsonDocument resp;
    #else
      StaticJsonDocument<1024> resp;
    #endif

    DeserializationError error = deserializeJson(resp, responseString);

    if (!error) {
      bool success = resp["success"] | false;
      const char* action = resp["action"] | "";
      const char* message = resp["message"] | "";
      const char* errorCode = resp["errorCode"] | "";

      if (success) {
        const char* name = resp["member"]["fullName"] | "Student";
        const char* dept = resp["member"]["department"] | "";
        
        Serial.println(F("=================================================="));
        Serial.print(F("✅ [ACCESS GRANTED] "));
        Serial.println(action);
        Serial.print(F("👤 Member: ")); Serial.print(name); Serial.print(F(" (")); Serial.print(dept); Serial.println(F(")"));
        Serial.print(F("💬 Note: ")); Serial.println(message);
        Serial.println(F("=================================================="));

        if (strcmp(action, "ENTRY") == 0) {
          playSuccessEntry();
        } else {
          playSuccessExit();
        }
      } else {
        Serial.println(F("=================================================="));
        Serial.print(F("⚠️ [ACCESS REJECTED] Code: "));
        Serial.println(errorCode);
        Serial.print(F("💬 Reason: ")); Serial.println(message);
        Serial.println(F("=================================================="));

        if (strcmp(errorCode, "COOLDOWN") == 0) {
          int remaining = resp["remainingCooldownSeconds"] | 15;
          Serial.print(F("⏳ Cooldown Active: Wait "));
          Serial.print(remaining);
          Serial.println(F("s before next scan."));
          playCooldownTone();
        } else {
          playDeniedTone();
        }
      }
    } else {
      Serial.println(F("[HTTP] JSON parse error on response"));
      playDeniedTone();
    }
  } else {
    Serial.print(F("[HTTP] Connection failed: "));
    Serial.println(http.errorToString(httpCode).c_str());
    playNetworkErrorTone();
  }

  http.end();
}

// ============================================================================
// 9. REST API: SEND DEVICE HEARTBEAT TELEMETRY
// ============================================================================
void sendDeviceHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String("http://") + SERVER_HOST + ":" + SERVER_PORT + API_HEARTBEAT_PATH;

  finger.getTemplateCount();

  #if ARDUINOJSON_VERSION_MAJOR >= 7
    JsonDocument doc;
  #else
    StaticJsonDocument<512> doc;
  #endif

  doc["deviceId"] = DEVICE_ID;
  doc["deviceName"] = DEVICE_NAME;
  doc["manufacturer"] = "Espressif / Synochip";
  doc["model"] = "ESP32 Dev Module + R307/AS608 Optical Sensor";
  doc["connectionType"] = "SERIAL";
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["status"] = sensorConnected ? "ONLINE" : "ERROR";

  doc["telemetry"]["rssi"] = WiFi.RSSI();
  doc["telemetry"]["freeHeap"] = ESP.getFreeHeap();
  doc["telemetry"]["enrolledTemplates"] = finger.templateCount;
  doc["telemetry"]["uptimeSeconds"] = millis() / 1000;
  doc["telemetry"]["sensorOperational"] = sensorConnected;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  http.begin(url);
  http.setTimeout(3000);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(jsonPayload);
  if (httpCode == 200) {
    Serial.println(F("[Heartbeat] Telemetry ping acknowledged by server."));
  } else {
    Serial.print(F("[Heartbeat] Server ping response: "));
    Serial.println(httpCode);
  }

  http.end();
}

// ============================================================================
// 10. BIOMETRIC SCANNING LOOP
// ============================================================================
void handleBiometricScan() {
  if (!sensorConnected) {
    static unsigned long lastRetry = 0;
    if (millis() - lastRetry > 5000) {
      lastRetry = millis();
      initFingerprintSensor();
    }
    return;
  }

  // Query sensor for finger presence
  uint8_t p = finger.getImage();
  if (p == FINGERPRINT_NOFINGER) {
    return; // No finger currently placed
  }

  if (p != FINGERPRINT_OK) {
    Serial.println(F("[Scan] Error reading optical sensor image."));
    return;
  }

  // Finger Detected! Short chirp and Blue LED alert
  playBeep(30, 2600);
  digitalWrite(LED_BLUE_PIN, HIGH);
  Serial.println(F("\n[Scan] Finger detected! Converting to template..."));

  // Convert image to feature template in Buffer 1
  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) {
    digitalWrite(LED_BLUE_PIN, LOW);
    if (p == FINGERPRINT_IMAGEMESS) {
      Serial.println(F("[Scan] Fingerprint image too messy/blurred. Place finger firmly."));
    } else {
      Serial.println(F("[Scan] Feature extraction failed."));
    }
    playDeniedTone();
    return;
  }

  // Search local sensor flash memory (1:N match)
  Serial.println(F("[Scan] Searching on-chip flash database..."));
  p = finger.fingerSearch();
  digitalWrite(LED_BLUE_PIN, LOW);

  if (p == FINGERPRINT_OK) {
    Serial.print(F("🎯 [Scan] MATCH FOUND! Slot ID #"));
    Serial.print(finger.fingerID);
    Serial.print(F(" with Confidence Score: "));
    Serial.println(finger.confidence);

    // Forward matched identity to Next.js attendance state machine
    sendAttendanceScan(finger.fingerID, finger.confidence);
    lastScanTime = millis();
  } else if (p == FINGERPRINT_NOTFOUND) {
    Serial.println(F("❌ [Scan] FINGERPRINT NOT RECOGNIZED. Unregistered member."));
    playDeniedTone();
    lastScanTime = millis();
  } else {
    Serial.print(F("[Scan] Search error: 0x"));
    Serial.println(p, HEX);
    playDeniedTone();
  }

  // Wait for user to lift finger to prevent continuous re-triggering
  Serial.println(F("[Scan] Waiting for finger removal..."));
  unsigned long waitStart = millis();
  while (finger.getImage() != FINGERPRINT_NOFINGER && millis() - waitStart < 3000) {
    delay(50);
  }
}

// ============================================================================
// 11. INTERACTIVE GUIDED ENROLLMENT ROUTINE
// ============================================================================
bool enrollFingerprint(uint16_t id) {
  if (id < 1 || id > 1000) {
    Serial.println(F("[Enroll] Invalid Slot ID. Must be between 1 and 1000."));
    return false;
  }

  Serial.println(F("\n=================================================="));
  Serial.print(F("📝 [ENROLLMENT MODE] Starting enrollment for Slot ID #"));
  Serial.println(id);
  Serial.println(F("=================================================="));

  int p = -1;

  // ----------------- STEP 1: FIRST TOUCH -----------------
  Serial.println(F("👉 STEP 1: Place your finger on the optical sensor..."));
  digitalWrite(LED_BLUE_PIN, HIGH);
  playBeep(80, 2000);

  unsigned long timeout = millis();
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    if (millis() - timeout > 15000) {
      Serial.println(F("⏰ [Enroll] Timed out waiting for finger."));
      digitalWrite(LED_BLUE_PIN, LOW);
      playDeniedTone();
      return false;
    }
    delay(50);
  }

  p = finger.image2Tz(1); // Buffer 1
  if (p != FINGERPRINT_OK) {
    Serial.println(F("❌ [Enroll] First capture conversion failed. Try again."));
    digitalWrite(LED_BLUE_PIN, LOW);
    playDeniedTone();
    return false;
  }

  Serial.println(F("✅ [Enroll] Image 1 captured successfully!"));
  digitalWrite(LED_BLUE_PIN, LOW);
  playBeep(100, 2500);

  // ----------------- STEP 2: REMOVE FINGER -----------------
  Serial.println(F("✋ STEP 2: Remove your finger from the sensor..."));
  delay(1000);
  p = 0;
  while (p != FINGERPRINT_NOFINGER) {
    p = finger.getImage();
    delay(50);
  }

  // ----------------- STEP 3: SECOND TOUCH -----------------
  Serial.println(F("👉 STEP 3: Place the SAME finger on the sensor again..."));
  digitalWrite(LED_BLUE_PIN, HIGH);
  playBeep(80, 2000);

  p = -1;
  timeout = millis();
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    if (millis() - timeout > 15000) {
      Serial.println(F("⏰ [Enroll] Timed out waiting for second touch."));
      digitalWrite(LED_BLUE_PIN, LOW);
      playDeniedTone();
      return false;
    }
    delay(50);
  }

  p = finger.image2Tz(2); // Buffer 2
  if (p != FINGERPRINT_OK) {
    Serial.println(F("❌ [Enroll] Second capture conversion failed. Try again."));
    digitalWrite(LED_BLUE_PIN, LOW);
    playDeniedTone();
    return false;
  }

  Serial.println(F("✅ [Enroll] Image 2 captured successfully!"));

  // ----------------- STEP 4: CREATE MODEL & STORE -----------------
  Serial.println(F("⚙️ [Enroll] Matching samples and generating biometric template..."));
  p = finger.createModel();
  if (p == FINGERPRINT_OK) {
    Serial.println(F("🎉 [Enroll] Templates matched! Storing in sensor flash memory..."));
  } else if (p == FINGERPRINT_ENROLLMISMATCH) {
    Serial.println(F("❌ [Enroll] Fingerprints did not match. Enrollment aborted."));
    digitalWrite(LED_BLUE_PIN, LOW);
    playDeniedTone();
    return false;
  } else {
    Serial.println(F("❌ [Enroll] Error creating template model."));
    digitalWrite(LED_BLUE_PIN, LOW);
    playDeniedTone();
    return false;
  }

  p = finger.storeModel(id);
  digitalWrite(LED_BLUE_PIN, LOW);

  if (p == FINGERPRINT_OK) {
    Serial.println(F("=================================================="));
    Serial.print(F("🏆 [ENROLLED] Successfully stored Member in Slot #"));
    Serial.println(id);
    Serial.print(F("🔑 Credential Reference: "));
    Serial.print(CREDENTIAL_PREFIX);
    char buf[8];
    snprintf(buf, sizeof(buf), "%03d", id);
    Serial.println(buf);
    Serial.println(F("=================================================="));

    // Success Fanfare
    playChimeWelcome();
    playSuccessEntry();
    return true;
  } else {
    Serial.print(F("❌ [Enroll] Error writing to flash slot: 0x"));
    Serial.println(p, HEX);
    playDeniedTone();
    return false;
  }
}

// ============================================================================
// 12. SERIAL MONITOR COMMAND CONSOLE
// ============================================================================
void handleSerialCommands() {
  if (!Serial.available()) return;

  String cmd = Serial.readStringUntil('\n');
  cmd.trim();

  if (cmd.length() == 0) return;

  Serial.print(F("\n> Command Received: "));
  Serial.println(cmd);

  if (cmd.equalsIgnoreCase("help")) {
    Serial.println(F("\n--- RLR ESP32 Fingerprint Node Commands ---"));
    Serial.println(F("  help         : Display this command menu"));
    Serial.println(F("  info         : Display system status, Wi-Fi IP, and sensor specs"));
    Serial.println(F("  count        : Display number of stored fingerprints in flash"));
    Serial.println(F("  enroll <id>  : Enroll finger into Slot <id> (e.g. enroll 1)"));
    Serial.println(F("  delete <id>  : Delete fingerprint template at Slot <id>"));
    Serial.println(F("  empty        : Clear ALL fingerprints from sensor memory"));
    Serial.println(F("  ping         : Send immediate heartbeat telemetry to server"));
    Serial.println(F("  scan         : Trigger test fingerprint scan"));
    Serial.println(F("-------------------------------------------\n"));
  } else if (cmd.equalsIgnoreCase("info")) {
    Serial.println(F("\n=== System Information ==="));
    Serial.print(F("Device ID: ")); Serial.println(DEVICE_ID);
    Serial.print(F("Firmware: ")); Serial.println(FIRMWARE_VERSION);
    Serial.print(F("Wi-Fi Status: ")); Serial.println(WiFi.status() == WL_CONNECTED ? "CONNECTED" : "DISCONNECTED");
    Serial.print(F("ESP32 IP: ")); Serial.println(WiFi.localIP());
    Serial.print(F("RSSI Signal: ")); Serial.print(WiFi.RSSI()); Serial.println(F(" dBm"));
    Serial.print(F("Laptop Server: http://")); Serial.print(SERVER_HOST); Serial.print(F(":")); Serial.println(SERVER_PORT);
    Serial.print(F("Free RAM: ")); Serial.print(ESP.getFreeHeap() / 1024); Serial.println(F(" KB"));
    finger.getTemplateCount();
    Serial.print(F("Sensor Templates: ")); Serial.println(finger.templateCount);
    Serial.println(F("==========================\n"));
  } else if (cmd.equalsIgnoreCase("count")) {
    finger.getTemplateCount();
    Serial.print(F("[Sensor] Total Enrolled Fingerprints: "));
    Serial.println(finger.templateCount);
  } else if (cmd.startsWith("enroll ")) {
    int id = cmd.substring(7).toInt();
    if (id > 0) {
      enrollFingerprint(id);
    } else {
      Serial.println(F("[Enroll] Invalid ID! Use: enroll <1-1000>"));
    }
  } else if (cmd.startsWith("delete ")) {
    int id = cmd.substring(7).toInt();
    if (id > 0) {
      uint8_t p = finger.deleteModel(id);
      if (p == FINGERPRINT_OK) {
        Serial.print(F("🗑️ [Sensor] Deleted fingerprint at Slot #")); Serial.println(id);
        playBeep(100, 2000);
      } else {
        Serial.print(F("❌ [Sensor] Could not delete Slot #")); Serial.println(id);
        playDeniedTone();
      }
    }
  } else if (cmd.equalsIgnoreCase("empty")) {
    Serial.println(F("⚠️ Clearing ALL fingerprints from sensor flash memory..."));
    uint8_t p = finger.emptyDatabase();
    if (p == FINGERPRINT_OK) {
      Serial.println(F("🗑️ Sensor database cleared successfully!"));
      playBeep(200, 1500);
    } else {
      Serial.println(F("❌ Error emptying database."));
      playDeniedTone();
    }
  } else if (cmd.equalsIgnoreCase("ping")) {
    sendDeviceHeartbeat();
  } else if (cmd.equalsIgnoreCase("scan")) {
    handleBiometricScan();
  } else {
    Serial.println(F("Unknown command. Type 'help' for available commands."));
  }
}

// ============================================================================
// 13. PHYSICAL BUTTONS HANDLER
// ============================================================================
void handleButtons() {
  // Button 1: Force Scan / Manual Ping (Active LOW)
  static bool btn1Last = HIGH;
  bool btn1Curr = digitalRead(BTN_SCAN_PIN);
  if (btn1Last == HIGH && btn1Curr == LOW) {
    delay(50); // Debounce
    if (digitalRead(BTN_SCAN_PIN) == LOW) {
      Serial.println(F("\n[Button 1] Manual trigger pressed."));
      playBeep(50, 2400);
      sendDeviceHeartbeat();
    }
  }
  btn1Last = btn1Curr;

  // Button 2: Enrollment Trigger (Hold for 3 seconds)
  bool btn2Curr = digitalRead(BTN_ENROLL_PIN);
  if (btn2Curr == LOW) {
    if (!btnEnrollHolding) {
      btnEnrollHolding = true;
      btnEnrollPressStart = millis();
    } else if (millis() - btnEnrollPressStart >= BTN_LONG_PRESS_MS) {
      // Long press detected! Enter enrollment for next free slot
      Serial.println(F("\n[Button 2] Long press detected! Entering Quick Enrollment Mode..."));
      playBeep(100, 2000);
      delay(80);
      playBeep(150, 2600);

      finger.getTemplateCount();
      uint16_t nextSlot = finger.templateCount + 1;
      enrollFingerprint(nextSlot);

      btnEnrollHolding = false;
      // Wait for button release
      while (digitalRead(BTN_ENROLL_PIN) == LOW) delay(50);
    }
  } else {
    btnEnrollHolding = false;
  }
}

// ============================================================================
// 14. ARDUINO SETUP
// ============================================================================
void setup() {
  Serial.begin(DEBUG_BAUD_RATE);
  delay(1000);

  Serial.println(F("\n========================================================"));
  Serial.println(F("🤖 ROBOTICS LAB OF RKV (RLR) — SMART ATTENDANCE NODE"));
  Serial.println(F("Hardware: ESP32 + R307/AS608 Optical Fingerprint Module"));
  Serial.print(F("Firmware Version: ")); Serial.println(FIRMWARE_VERSION);
  Serial.println(F("========================================================"));

  // Initialize GPIO Pins
  pinMode(LED_BLUE_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_BLUE_PIN, LOW);
  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  pinMode(BTN_SCAN_PIN, INPUT_PULLUP);
  pinMode(BTN_ENROLL_PIN, INPUT_PULLUP);

  // Play startup welcome sound
  playChimeWelcome();

  // Initialize Fingerprint Module
  initFingerprintSensor();

  // Connect to Redmi 13 5G Wi-Fi
  connectWiFi();

  // Send initial boot heartbeat to Next.js server
  sendDeviceHeartbeat();

  Serial.println(F("\n🚀 System Ready! Place registered finger on optical sensor."));
  Serial.println(F("💡 Type 'help' in Serial Monitor for interactive commands.\n"));
}

// ============================================================================
// 15. ARDUINO MAIN LOOP
// ============================================================================
void loop() {
  // 1. Maintain Wi-Fi Connection
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastWifiRetry = 0;
    if (millis() - lastWifiRetry > 10000) {
      lastWifiRetry = millis();
      connectWiFi();
    }
  }

  // 2. Periodic Server Heartbeat
  if (millis() - lastHeartbeatTime > HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatTime = millis();
    sendDeviceHeartbeat();
  }

  // 3. Check Physical Push Buttons
  handleButtons();

  // 4. Check Serial Monitor Commands
  handleSerialCommands();

  // 5. Check Fingerprint Sensor for attendance scan
  if (millis() - lastScanTime >= SENSOR_POLL_INTERVAL_MS) {
    handleBiometricScan();
  }

  delay(20);
}
