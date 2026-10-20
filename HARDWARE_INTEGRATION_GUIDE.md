# Robotics Lab of RKV (RLR) — Hardware Integration Guide

This guide describes how to configure, connect, test, and deploy physical biometric fingerprint scanners with the RLR Smart Entry & Attendance Management System.

---

## 1. Architecture Overview

```
+-------------------------------------------------------------+
|               Entrance Kiosk Touchscreen                    |
|      (Next.js Web Interface running in Full-Screen)         |
+------------------------------+------------------------------+
                               |
            WebSocket & HTTP   | (ws://localhost:8080/fingerprint)
                               v
+-------------------------------------------------------------+
|            RLR Local Hardware Agent (Daemon)                |
|               (Node.js / Python Service)                    |
+------------------------------+------------------------------+
                               |
              Vendor Driver    | USB / Serial UART
                               v
+-------------------------------------------------------------+
|             Physical Fingerprint Sensor                     |
|  - Mantra MFS100 (Optical 500 DPI)                          |
|  - DigitalPersona U.are.U 4500                              |
|  - SecuGen Hamster Pro 20                                   |
|  - AS608 / R307 Optical Sensor via Arduino / ESP32 Serial   |
+-------------------------------------------------------------+
```

---

## 2. Supported Fingerprint Scanners

### Option A: Mantra MFS100 (Recommended for Indian Universities & Aadhaar/UIDAI standards)
- **Sensor Type**: Optical Sensor with scratch-free sensor surface.
- **Resolution**: 500 DPI / 256 gray levels.
- **Interface**: USB 2.0 High Speed.
- **Driver Required**: Mantra MFS100 Driver v9.2.0.0 & Mantra RD Service.
- **How it integrates**: Mantra RD Service opens an HTTP loopback server on `http://127.0.0.1:11100`. The RLR Hardware Agent issues XML `CAPTURE` requests to port 11100, receives the ISO 19794-2 biometric template or encrypted PID block, and maps it to a member credential identifier.

### Option B: DigitalPersona 4500 / 5160 (HID Global)
- **Sensor Type**: Optical silicone coated glass.
- **Resolution**: 512 DPI.
- **Driver Required**: DigitalPersona One Touch for Windows SDK (v1.6.1 or later) or HID DigitalPersona WebSDK.
- **How it integrates**: The WebSDK provides a local WebSocket server that emits captured ANSI 378 minutiae templates.

### Option C: Embedded AS608 / R307 / R503 Serial Modules (Low Cost / Arduino / ESP32)
- **Sensor Type**: Optical CMOS with built-in DSP matching engine.
- **Capacity**: 300 to 1,000 fingerprint templates stored directly on chip.
- **Interface**: UART TTL (57600 baud, 8N1).
- **Wiring**:
  - `VCC` -> 3.3V or 5V (depending on sensor model)
  - `GND` -> Ground
  - `TX`  -> RX of USB-to-UART Adapter (e.g. CP2102)
  - `RX`  -> TX of USB-to-UART Adapter
- **Protocol**: 
  - Send packet `0xEF 0x01 ...` command `0x01` (`GenImg`) -> sensor reads finger.
  - Command `0x02` (`Img2Tz`) -> converts image to feature template in buffer.
  - Command `0x03` (`Search`) -> 1:N match against on-chip flash memory.
  - Returns matched PageID (e.g., ID #14).
  - The local agent translates PageID #14 -> `FP-RLR-2024-014` and posts to the Next.js API!

---

## 3. Biometric Security & Privacy Guidelines

1. **No Raw Fingerprint Image Storage**:
   - The application database **never** stores raw uncompressed BMP/PNG fingerprint images.
   - Only opaque cryptographic token references (e.g. `FP-RLR-2024-001`) or non-reversible mathematical minutiae representations (ANSI/INCITS 378 or ISO/IEC 19794-2) are stored.
2. **Device-Side Matching**:
   - For AS608/R307 and Mantra sensors, 1:N matching occurs inside the hardware or secure vendor runtime. The web application receives only the verified credential token.
3. **Audit Trail**:
   - Every scan specifies `verification_source = 'FINGERPRINT_HARDWARE'`.
   - Simulated test scans in development mode are explicitly tagged as `verification_source = 'FINGERPRINT_DEMO'`.

---

## 4. Setup and Verification Workflow

### Step 1: Install Scanner Drivers
1. Connect the USB fingerprint reader to the entrance kiosk machine.
2. Install the manufacturer driver:
   - For Mantra: Run `MFS100Driver_9.2.0.0.exe` and `MFS100ClientService.exe`.
   - Verify green LED pulses when scanner is plugged in.

### Step 2: Launch Hardware Agent
```bash
cd hardware-agent
npm install
npm start
```
You should see:
```
====================================================
🤖 RLR Fingerprint Hardware Agent Running on port 8080
   HTTP Endpoint: http://localhost:8080
   WebSocket URL: ws://localhost:8080/fingerprint
====================================================
```

### Step 3: Switch RLR Web App to Hardware Mode
1. In the RLR Web App, navigate to **Settings** -> **Device Integration**.
2. Switch Mode from **Demo Mode** to **Hardware Mode**.
3. Verify connection status indicator changes to `[🟢 HARDWARE AGENT CONNECTED]`.
4. Go to **Fingerprint Devices** and click **Test Device Connection**.
5. Open the **Kiosk** (`/kiosk`) and place your registered finger on the physical scanner.
6. The kiosk detects the finger touch, verifies the identity, and displays the personalized welcome or exit screen!
