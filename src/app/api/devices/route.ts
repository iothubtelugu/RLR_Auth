import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { demoAdapter } from '@/lib/biometrics/demoAdapter';
import { hardwareAgentClient } from '@/lib/biometrics/hardwareAgentClient';

export async function GET() {
  try {
    const db = getDb();
    const devices = db.prepare('SELECT * FROM devices ORDER BY created_at ASC').all() as any[];

    // Fetch active device settings
    const modeSetting = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('fingerprint_mode') as { value: string } | undefined;
    const currentMode = modeSetting ? JSON.parse(modeSetting.value) : 'demo';

    // Live telemetry from current active adapter
    const activeAdapter = currentMode === 'hardware' ? hardwareAgentClient : demoAdapter;
    const liveStatus = await activeAdapter.getStatus();

    return NextResponse.json({
      success: true,
      currentMode,
      activeStatus: liveStatus,
      devices,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
