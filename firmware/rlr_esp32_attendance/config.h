/**
 * Robotics Lab of RKV (RLR) — Smart Biometric Attendance System
 * ESP32 Hardware Firmware Configuration
 * 
 * Hardware:
 *   - ESP32 Dev Module (NodeMCU-32S / ESP-WROOM-32)
 *   - Optical Fingerprint Sensor Module (R307 / AS608 / FPM10A)
 *   - Red LED & Blue LED (Status indicators)
 *   - Buzzer (Active or Passive 5V/3.3V)
 *   - Push Buttons (Manual Scan / Enrollment Mode)
 */

#ifndef RLR_CONFIG_H
#define RLR_CONFIG_H

#include <Arduino.h>

// ============================================================================
// 1. WI-FI & NETWORK CONFIGURATION
// ============================================================================
// Lab / Hotspot Wi-Fi network credentials
// Both the ESP32 and Laptop must connect to this same Wi-Fi network!
#define WIFI_SSID           "Redmi 13 5G"          // Your exact Wi-Fi / Hotspot name
#define WIFI_PASSWORD       "12345678"             // Hotspot Wi-Fi password

// Next.js Attendance Backend Server IP and Port
// Auto-detected Laptop Wi-Fi IP: 10.206.84.110
#define SERVER_HOST         "10.206.84.110"
#define SERVER_PORT         3001

// API Endpoints
#define API_SCAN_PATH       "/api/attendance/scan"
#define API_HEARTBEAT_PATH  "/api/devices/heartbeat"

// Device Identity
#define DEVICE_ID           "dev-rlr-esp32-01"
#define DEVICE_NAME         "RLR Door Access Node (ESP32 + R307)"
#define FIRMWARE_VERSION    "v1.2.0-esp32"

// ============================================================================
// 2. HARDWARE PIN DEFINITIONS (ESP32)
// ============================================================================
// Optical Fingerprint Sensor UART Pins (Uses HardwareSerial UART2)
// Connect Sensor TX to ESP32 RX2 (GPIO 16)
// Connect Sensor RX to ESP32 TX2 (GPIO 17)
#define FP_RX_PIN           16   // ESP32 RX2 <-- R307/AS608 TX (Green/Yellow wire)
#define FP_TX_PIN           17   // ESP32 TX2 --> R307/AS608 RX (White/Blue wire)

// Optional Fingerprint Touch/Wakeup Pin (Active HIGH when finger touches optical prism)
// Connect to Sensor Touch pin if available on your 6-pin cable (leave undefined if not used)
#define FP_TOUCH_PIN        4    // ESP32 GPIO 4 (Touch-out / Wakeup)
#define USE_TOUCH_INTERRUPT false

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
// Serial communication baud rate with R307/AS608 (default factory is 57600)
#define FP_BAUD_RATE        57600

// Serial monitor debug baud rate
#define DEBUG_BAUD_RATE     115200

// Credential Reference Prefix Format
// Maps sensor flash Slot 1 -> "FP-RLR-2024-001" (matches seeded database records)
#define CREDENTIAL_PREFIX   "FP-RLR-2024-"
#define MEMBER_ID_PREFIX    "RLR-2024-"

// ============================================================================
// 4. TIMING & THRESHOLD CONSTANTS
// ============================================================================
#define HEARTBEAT_INTERVAL_MS   30000   // Send status ping to server every 30s
#define SENSOR_POLL_INTERVAL_MS 150     // Polling delay between fingerprint queries
#define LOCAL_SCAN_COOLDOWN_MS  2500    // Minimum ms before allowing another local scan
#define BTN_LONG_PRESS_MS       3000    // Hold Button 2 for 3s to trigger enrollment
#define HTTP_TIMEOUT_MS         5000    // HTTP request timeout

#endif // RLR_CONFIG_H
