import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { demoAdapter } from '@/lib/biometrics/demoAdapter';
import { hardwareAgentClient } from '@/lib/biometrics/hardwareAgentClient';
import { getSessionUser, hasPermission } from '@/lib/auth/session';
import { getCurrentTimestamp } from '@/lib/utils/timezone';

export async function GET() {
  try {
    const db = getDb();
    const modeSetting = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('fingerprint_mode') as { value: string } | undefined;
    const currentMode = modeSetting ? JSON.parse(modeSetting.value) : 'demo';

    const activeAdapter = currentMode === 'hardware' ? hardwareAgentClient : demoAdapter;
    const liveStatus = await activeAdapter.getStatus();
    const testResult = await activeAdapter.testConnection();

    return NextResponse.json({
      success: true,
      currentMode,
      status: liveStatus,
      test: testResult,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!hasPermission(session.role, 'MANAGE_DEVICES')) {
      return NextResponse.json({ error: 'Permission denied: Requires Administrator role' }, { status: 403 });
    }

    const body = await request.json();
    const { mode, action } = body;
    const db = getDb();
    const nowIso = getCurrentTimestamp();

    if (action === 'TOGGLE_MODE' && (mode === 'demo' || mode === 'hardware')) {
      db.prepare(`
        INSERT INTO system_settings (key, value, description, updated_at, updated_by_user_id)
        VALUES ('fingerprint_mode', ?, 'Active fingerprint operating mode', ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by_user_id = excluded.updated_by_user_id
      `).run(JSON.stringify(mode), nowIso, session.userId);

      // Audit log
      const auditId = `AUD-${Date.now()}`;
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, username, action, target_type, target_id, details, timestamp)
        VALUES (?, ?, ?, 'DEVICE_MODE_SWITCHED', 'DEVICE', 'all', ?, ?)
      `).run(
        auditId,
        session.userId,
        session.username,
        JSON.stringify({ newMode: mode }),
        nowIso
      );

      return NextResponse.json({ success: true, mode });
    }

    return NextResponse.json({ error: 'Invalid action or parameters' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
