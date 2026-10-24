import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentTimestamp } from '@/lib/utils/timezone';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      deviceId = 'dev-rlr-esp32-01',
      deviceName = 'RLR Door Access Node (ESP32 + R307)',
      manufacturer = 'Espressif / Synochip',
      model = 'ESP32 Dev Module + R307/AS608 Optical Sensor',
      connectionType = 'WIFI_HTTP',
      ipAddress = null,
      firmwareVersion = 'v1.2.0-esp32',
      status = 'ONLINE',
      notes = 'ESP32 biometric entry/exit terminal at main lab entrance.',
      telemetry = {},
    } = body;

    const db = getDb();
    const nowIso = getCurrentTimestamp();

    // Check if device exists or upsert
    const existing = db.prepare('SELECT id FROM devices WHERE id = ?').get(deviceId);

    if (existing) {
      db.prepare(`
        UPDATE devices
        SET 
          status = ?,
          last_seen_at = ?,
          ip_or_port = COALESCE(?, ip_or_port),
          firmware_version = COALESCE(?, firmware_version),
          notes = COALESCE(?, notes)
        WHERE id = ?
      `).run(status, nowIso, ipAddress, firmwareVersion, notes, deviceId);
    } else {
      // Allowed connection types in DB
      const safeConnType = ['WEBSOCKET_AGENT', 'WEBUSB', 'SERIAL', 'DEMO_ADAPTER', 'WIFI_HTTP'].includes(connectionType)
        ? connectionType
        : 'SERIAL';

      db.prepare(`
        INSERT INTO devices (
          id, device_name, manufacturer, model, connection_type,
          status, last_seen_at, last_successful_scan_at, ip_or_port,
          firmware_version, is_demo, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 0, ?, ?)
      `).run(
        deviceId,
        deviceName,
        manufacturer,
        model,
        safeConnType,
        status,
        nowIso,
        ipAddress,
        firmwareVersion,
        notes,
        nowIso
      );
    }

    return NextResponse.json({
      success: true,
      deviceId,
      serverTime: nowIso,
      status: 'ACKNOWLEDGED',
      telemetryRecorded: telemetry,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to process device heartbeat',
      },
      { status: 500 }
    );
  }
}
