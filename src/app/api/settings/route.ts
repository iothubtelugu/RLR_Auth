import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser, hasPermission } from '@/lib/auth/session';
import { getCurrentTimestamp } from '@/lib/utils/timezone';

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value, description, updated_at FROM system_settings').all() as any[];

    const settings: Record<string, any> = {};
    rows.forEach((r) => {
      try {
        settings[r.key] = JSON.parse(r.value);
      } catch {
        settings[r.key] = r.value;
      }
    });

    return NextResponse.json({ success: true, settings });
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

    if (!hasPermission(session.role, 'MANAGE_SETTINGS')) {
      return NextResponse.json({ error: 'Permission denied: Requires Administrator role' }, { status: 403 });
    }

    const body = await request.json();
    const db = getDb();
    const nowIso = getCurrentTimestamp();

    const insertOrUpdate = db.prepare(`
      INSERT INTO system_settings (key, value, updated_at, updated_by_user_id)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at,
        updated_by_user_id = excluded.updated_by_user_id
    `);

    const transaction = db.transaction(() => {
      for (const [key, val] of Object.entries(body)) {
        insertOrUpdate.run(key, JSON.stringify(val), nowIso, session.userId);
      }

      // Log in audit
      const auditId = `AUD-${Date.now()}`;
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, username, action, target_type, target_id, details, timestamp)
        VALUES (?, ?, ?, 'SETTINGS_UPDATED', 'SETTINGS', 'global', ?, ?)
      `).run(
        auditId,
        session.userId,
        session.username,
        JSON.stringify(body),
        nowIso
      );
    });

    transaction();

    return NextResponse.json({ success: true, message: 'Settings updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
