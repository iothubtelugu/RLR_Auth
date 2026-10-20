# RLR Fingerprint Hardware Agent

This daemon service runs on the kiosk computer or Raspberry Pi at the laboratory entrance to communicate with physical USB fingerprint scanners.

## Supported Fingerprint Hardware
1. **Mantra MFS100 / MFS500**:
   - Requires Mantra RD Service / Client Service running on port `11100`.
   - The agent forwards capture requests to `http://localhost:11100/rd/capture`.
2. **SecuGen Hamster Pro 20 / Hamster Plus**:
   - Requires SecuGen WebAPI service on `https://localhost:8443/SGIFP/`.
3. **DigitalPersona U.are.U 4500 / 5160**:
   - Requires DigitalPersona One Touch SDK / WebSDK service.
4. **Optical AS608 / R307 / R503 (Serial/UART)**:
   - Connect via CP2102/CH340 USB-UART adapter at 57600 baud.
   - The agent communicates with the microcontroller over serial.

## Setup Instructions

```bash
cd hardware-agent
npm install
npm start
```

Default port is `8080`.
The web kiosk connects to `ws://localhost:8080/fingerprint` and sends REST calls to `http://localhost:8080/api/scan`.
