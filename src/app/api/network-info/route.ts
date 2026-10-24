import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  try {
    const interfaces = os.networkInterfaces();
    const addresses: Array<{ name: string; ip: string; mac: string }> = [];

    let primaryIp = '127.0.0.1';

    for (const [name, netList] of Object.entries(interfaces)) {
      if (!netList) continue;
      for (const net of netList) {
        // Skip over non-IPv4 and internal/loopback addresses
        if (net.family === 'IPv4' && !net.internal) {
          addresses.push({
            name,
            ip: net.address,
            mac: net.mac,
          });

          // Prefer Wi-Fi or Wireless interface as primary
          if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wireless') || name.toLowerCase().includes('wlan')) {
            primaryIp = net.address;
          } else if (primaryIp === '127.0.0.1') {
            primaryIp = net.address;
          }
        }
      }
    }

    const port = process.env.PORT || 3001;

    const configSnippet = `// In firmware/rlr_esp32_attendance/config.h:
#define WIFI_SSID       "Redmi 13 5G"           // Replace with your exact Wi-Fi SSID
#define WIFI_PASSWORD   "Your_WiFi_Password"     // Your Wi-Fi password
#define SERVER_HOST     "${primaryIp}"    // Laptop IP address on Wi-Fi
#define SERVER_PORT     ${port}                 // Next.js Attendance Port`;

    return NextResponse.json({
      success: true,
      primaryIp,
      port: Number(port),
      scanEndpoint: `http://${primaryIp}:${port}/api/attendance/scan`,
      heartbeatEndpoint: `http://${primaryIp}:${port}/api/devices/heartbeat`,
      addresses,
      configSnippet,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
