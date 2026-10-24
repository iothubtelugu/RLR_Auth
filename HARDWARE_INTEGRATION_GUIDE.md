# Robotics Lab of RKV (RLR) — Smart Biometric Hardware Integration Guide

This guide describes how to configure, wire, flash, calibrate, and deploy physical biometric fingerprint scanners with the **Robotics Lab of RKV (RLR)** Smart Entry & Attendance Management System.

---

## 1. System Architecture

```
+-------------------------------------------------------------------------------+
|                         Robotics Lab of RKV (RLR)                             |
|                           Next.js Attendance App                              |
|           (http://<SERVER_IP>:3001  or  http://localhost:3001)                |
+------------------------------------+------------------------------------------+
                                     ^
                                     |  HTTP REST JSON
              +----------------------+----------------------+
              |                                             |
              | POST /api/attendance/scan                   | POST /api/devices/heartbeat
              |                                             |
+-------------+-----------------------------+               |
|      ESP32 Standalone Access Node         |---------------+
|  - ESP32 Dev Module (WROOM-32 / NodeMCU)  |
|  - R307 / AS608 Optical Sensor (UART2)    |
|  - Blue Status LED (Pin 21)               |
|  - Red Error LED (Pin 22)                 |
|  - Buzzer Audio (Pin 19)                  |
|  - Push Buttons (Pin 18 Scan, Pin 23 Enroll)
+-------------------------------------------+
```

---

## 2. Hardware Bill of Materials (BOM)

| Component | Specification | Purpose |
|---|---|---|
| **ESP32 Dev Module** | ESP-WROOM-32 (30-pin or 38-pin), 240MHz, Wi-Fi 802.11b/g/n | Main controller, REST client, biometric state machine |
| **Optical Fingerprint Module** | R307 or AS608 (ZFM-20 / Synochip DSP) | 1:N on-chip optical biometric scanning (1,000 slots) |
| **Blue LED (5mm)** | Standard 3.2V forward drop | Ready, scanning, and success indicator |
| **Red LED (5mm)** | Standard 2.0V forward drop | Denied, cooldown, and error indicator |
| **Current Resistors** | 220Ω or 330Ω (1/4W) x 2 | Current limiting for LEDs |
| **Buzzer** | 5V / 3.3V Active or Passive Piezo Buzzer | Auditory confirmation (double-beeps, warning tones) |
| **Push Buttons** | 6mm Tactile Momentary Buttons x 2 | Button 1: Manual Scan/Ping, Button 2: Enrollment |
| **Power Supply** | 5V 2A USB Power Adapter / Micro-USB cable | Clean 5V DC power (critical for optical sensor LEDs) |
| **Connecting Wires** | Male-to-Female / Male-to-Male Jumper Wires | Interconnections |

---

## 3. Circuit Schematic & Pinout

### 3.1 Wiring Diagram

```
                 +-------------------------------------------------+
                 |                  ESP32 DEV MODULE               |
                 |                                                 |
   +5V Power --->| VIN                                          3V3|
    GND -------->| GND                                          GND|
                 |                                                 |
                 | GPIO 16 (RX2) <-------- [TXD] R307 / AS608      |
                 | GPIO 17 (TX2) --------> [RXD] Fingerprint       |
                 | GPIO 4  (Touch) <...... [TOUCH] (Optional)      |
                 |                                                 |
                 | GPIO 21 (Blue LED) ---> [220Ω] ---> [LED (+)] -+|
                 |                                      LED (-) ---|---> GND
                 | GPIO 22 (Red LED)  ---> [220Ω] ---> [LED (+)] -+|
                 |                                      LED (-) ---|---> GND
                 | GPIO 19 (Buzzer)   ---> [BUZZER (+)] ----------+|
                 |                         BUZZER (-) -------------|---> GND
                 |                                                 |
                 | GPIO 18 (Btn 1)    ---> [Push Button 1] --------|---> GND (INPUT_PULLUP)
                 | GPIO 23 (Btn 2)    ---> [Push Button 2] --------|---> GND (INPUT_PULLUP)
                 +-------------------------------------------------+
```

### 3.2 Pin Mapping Table

| Component | Pin / Wire | Connect to ESP32 | Function |
|---|---|---|---|
| **R307 / AS608** | **VCC** (Red) | **VIN / 5V** | 5V Power for optical sensor and prism backlight |
| **R307 / AS608** | **GND** (Black) | **GND** | Common Ground |
| **R307 / AS608** | **TXD** (Yellow/Green) | **GPIO 16 (RX2)** | Serial Data from Sensor to ESP32 |
| **R307 / AS608** | **RXD** (White/Blue) | **GPIO 17 (TX2)** | Serial Data from ESP32 to Sensor |
| **R307 / AS608** | **TOUCH** (Blue/Yellow) | **GPIO 4** (Optional) | Finger touch detect (Active HIGH) |
| **Blue LED** | Anode (+) | **GPIO 21** via 220Ω | Ready & Access Granted Indicator |
| **Blue LED** | Cathode (-) | **GND** | Ground |
| **Red LED** | Anode (+) | **GPIO 22** via 220Ω | Access Denied / Cooldown Indicator |
| **Red LED** | Cathode (-) | **GND** | Ground |
| **Buzzer** | Positive (+) | **GPIO 19** | Auditory Cues |
| **Buzzer** | Negative (-) | **GND** | Ground |
| **Button 1** | Terminal 1 & 2 | **GPIO 18** to **GND** | Force Scan / Server Ping (`INPUT_PULLUP`) |
| **Button 2** | Terminal 1 & 2 | **GPIO 23** to **GND** | Hold 3s for Quick Enrollment (`INPUT_PULLUP`) |

> [!IMPORTANT]
> **Power Supply Rule**: Always power the R307/AS608 sensor from the **VIN / 5V** pin of the ESP32 (powered by a 5V 2A USB wall supply). Powering the sensor from 3.3V can cause the internal optical camera to take underexposed images, leading to intermittent scan failures or "Did not find fingerprint sensor" errors.

---

## 4. Audio-Visual Signaling Behavior

| Event | Blue LED | Red LED | Buzzer Pattern | Meaning |
|---|---|---|---|---|
| **Booting / Connecting** | Blinking (2Hz) | OFF | Silent | Searching for Wi-Fi network |
| **Online & Ready** | 2 Quick Flashes | OFF | Ascending Welcome Chime | Ready for member check-in |
| **Finger Placed** | Solid ON | OFF | 1 Quick Chirp (30ms) | Optical image capture in progress |
| **ENTRY Granted** | Solid ON (2s) | OFF | High Double-Beep (2.2kHz + 2.8kHz) | Member entered lab; session started |
| **EXIT Granted** | Solid ON (2s) | OFF | High Triple-Beep (2.0kHz + 2.4kHz) | Member exited lab; session closed |
| **Access Denied** | OFF | 3 Rapid Blinks | 3 Error Beeps (800Hz) | Unregistered finger or inactive member |
| **Cooldown Active** | OFF | 2 Blinks | 2 Short Warning Buzzes | Repeated scan within 15s cooldown |
| **Network Error** | OFF | Slow Blink | Long Low Buzz (600ms) | Server unreachable / Wi-Fi disconnected |
| **Enrollment Mode** | Fast Blink | OFF | Guided Prompt Beeps | Interactive fingerprint enrollment |

---

## 5. Software & Firmware Setup

### Option 1: Using Arduino IDE (Recommended for Beginners)

1. **Install Arduino IDE** (v2.0 or newer) from [arduino.cc](https://www.arduino.cc/en/software).
2. **Add ESP32 Board Support**:
   - Go to **File** -> **Preferences**.
   - In "Additional Boards Manager URLs", add:
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Go to **Tools** -> **Board** -> **Boards Manager**, search for `esp32` by Espressif Systems and click **Install**.
3. **Install Required Libraries**:
   - Go to **Tools** -> **Manage Libraries...**.
   - Search for and install:
     - `Adafruit Fingerprint Sensor Library` (by Adafruit, v2.1.3+)
     - `ArduinoJson` (by Benoit Blanchon, v6.21.4 or v7.x)
4. **Open Firmware Sketch**:
   - Open `firmware/rlr_esp32_attendance/rlr_esp32_attendance.ino`.
5. **Configure Network & Server**:
   - Open `config.h` in the Arduino IDE tab.
   - Set your Wi-Fi credentials:
     ```cpp
     #define WIFI_SSID       "Your_Lab_WiFi"
     #define WIFI_PASSWORD   "Your_WiFi_Password"
     ```
   - Set your Next.js server computer's LAN IP address:
     ```cpp
     #define SERVER_HOST     "192.168.1.100"  // IP of PC running Next.js
     #define SERVER_PORT     3001
     ```
6. **Flash the ESP32**:
   - Select Board: **Tools** -> **Board** -> **esp32** -> **ESP32 Dev Module**.
   - Select Port: **Tools** -> **Port** -> `COMx` (Silicon Labs CP210x or CH340).
   - Click **Upload**. (If the IDE gets stuck at `Connecting......`, press and hold the **BOOT** button on the ESP32 until flashing starts).
7. **Open Serial Monitor**:
   - Set Baud rate to **115200 baud**.
   - Observe boot logs, Wi-Fi IP address, and sensor capacity.

---

### Option 2: Using PlatformIO in Visual Studio Code

1. Open the project root folder in VS Code with the **PlatformIO IDE** extension installed.
2. PlatformIO automatically reads `firmware/platformio.ini` and downloads the ESP32 toolchain and libraries.
3. Edit `firmware/rlr_esp32_attendance/config.h` with your Wi-Fi SSID and server IP.
4. Click the PlatformIO **Build** (✓) and **Upload** (➔) buttons on the bottom toolbar.

---

## 6. Fingerprint Enrollment Guide

To map physical fingers to lab members, each member must be enrolled into a sensor flash Slot ID (1 to 1,000):

### Method A: Via Arduino Serial Monitor (Interactive Console)

1. Open the Serial Monitor at **115200 baud**.
2. Type `help` to see all available commands:
   ```
   info         : Display system status, Wi-Fi IP, and sensor specs
   count        : Display number of stored fingerprints
   enroll <id>  : Enroll finger into Slot <id> (e.g. enroll 1)
   delete <id>  : Delete fingerprint template at Slot <id>
   empty        : Clear all fingerprints from sensor memory
   ping         : Send immediate heartbeat telemetry to server
   ```
3. Type `enroll 1` and press Enter to enroll Member 1 (Aarav Sharma):
   - **Step 1**: Place finger on the optical prism. Blue LED lights up and confirms capture.
   - **Step 2**: Remove finger when prompted.
   - **Step 3**: Place the *same* finger again.
   - **Step 4**: The ESP32 matches the two samples, writes the template to flash slot #1, and plays the success chime!
4. Repeat for other members:
   - Slot `1` -> Member `RLR-2024-001` (`FP-RLR-2024-001`)
   - Slot `2` -> Member `RLR-2024-002` (`FP-RLR-2024-002`)
   - Slot `3` -> Member `RLR-2024-003` (`FP-RLR-2024-003`)
   - ... up to Slot `1000`.

### Method B: Via Physical Push Button 2 (Standalone Enrollment)

1. Press and hold **Push Button 2** (GPIO 23) for **3 seconds**.
2. The buzzer sounds two ascending beeps, indicating Quick Enrollment Mode.
3. The ESP32 automatically selects the next available empty slot (e.g. Slot 4).
4. Follow the LED & buzzer cues:
   - Blue LED ON: Place finger.
   - Chirp + Blue LED OFF: Remove finger.
   - Blue LED ON: Place same finger again.
   - Triple chime: Enrollment complete!

---

## 7. Verifying Attendance on the Web Dashboard

1. **Start the Next.js Attendance Server**:
   ```bash
   npm run start
   ```
   (Runs on `http://localhost:3001` or `http://<SERVER_IP>:3001`).

2. **Monitor Live Device Telemetry**:
   - Go to `http://localhost:3001/devices`.
   - Under **Registered Biometric Devices & Access Nodes**, you will see:
     - `dev-rlr-esp32-01`
     - Status: **🟢 ONLINE**
     - Address: `<ESP32_IP>:3001`
     - Firmware: `v1.2.0-esp32`
     - Last Seen: *Updated in real time via periodic 30s heartbeat!*

3. **Perform a Test Attendance Scan**:
   - Place an enrolled finger on the optical sensor.
   - The ESP32 matches the finger, sends the JSON payload to `/api/attendance/scan`.
   - The Blue LED lights up solid and plays the double-beep chime.
   - Open the **Currently Inside** page (`/currently-inside`):
     - The member immediately appears as **Present Inside** with dynamic duration timer!
   - Scan again after the 15-second cooldown:
     - The member is marked as **EXIT**, duration is calculated, and session is recorded!
   - If an enrolled finger scans twice within 15 seconds:
     - The Red LED flashes twice and plays a warning tone with the message: *"Scan ignored: Repeated scan detected. Please wait Xs before scanning again."*

---

## 8. Troubleshooting & Diagnostics

### Problem 1: "ERROR: Did not find fingerprint sensor!"
- **Cause 1**: Inadequate 5V power. Optical sensors require ~100mA when the backlight LEDs illuminate. Make sure the sensor VCC is connected to ESP32 **VIN / 5V** and powered via a 5V 2A USB power adapter.
- **Cause 2**: Swapped TX/RX pins.
  - Verify: Sensor **TX** connects to ESP32 **GPIO 16 (RX2)**.
  - Verify: Sensor **RX** connects to ESP32 **GPIO 17 (TX2)**.
  - Try swapping the green and white/yellow wires.
- **Cause 3**: Baud rate mismatch. The firmware defaults to `57600 baud`. If your sensor was configured to 9600 or 115200, update `FP_BAUD_RATE` in `config.h`.

### Problem 2: "HTTP Connection failed" / "Connection refused"
- **Cause 1**: The ESP32 and Next.js server must be on the same local Wi-Fi subnet.
- **Cause 2**: `SERVER_HOST` in `config.h` must be the local IPv4 address of the computer running Next.js (e.g. `192.168.1.100`), **not** `localhost` or `127.0.0.1`.
- **Cause 3**: Windows Defender Firewall may block inbound traffic on port 3001. Allow Node.js through Windows Firewall:
  ```powershell
  New-NetFirewallRule -DisplayName "RLR Attendance Server" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
  ```

### Problem 3: "Fingerprint not recognized / Access Denied"
- Ensure finger was enrolled first using the `enroll <id>` command.
- Place finger flat and centered against the optical prism with firm, steady pressure.
- Check the confidence score in the Serial Monitor (scores > 50 are positive matches).

---

## 9. Security & Privacy Compliance

- **Minutiae Isolation**: The optical sensor never transmits uncompressed biometric raster images over the network. Only matching slot numbers and cryptographically managed token references (`FP-RLR-2024-XXX`) are transmitted to the Next.js API.
- **Local On-Chip Storage**: Fingerprint biometric templates are stored in the tamper-resistant secure flash memory of the DSP chip.
- **Full Audit Trail**: Every physical scan through the ESP32 is permanently recorded in `attendance_events` with `verification_source = 'FINGERPRINT_HARDWARE'` and `device_id = 'dev-rlr-esp32-01'`.
