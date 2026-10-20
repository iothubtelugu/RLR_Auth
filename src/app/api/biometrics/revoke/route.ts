import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser, hasPermission } from '@/lib/auth/session';
import { getCurrentTimestamp } from '@/lib/utils/timezone';

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!hasPermission(session.role, 'MANAGE_MEMBERS')) {
      return NextResponse.json({ error: 'Permission denied: Requires Administrator or Coordinator role' }, { status: 403 });
    }

    const body = await request.json();
    const { credentialId, reason } = body;

    if (!credentialId) {
      return NextResponse.json({ error: 'credentialId is required' }, { status: 400 });
    }

    const db = getDb();
    const cred = db.prepare('SELECT * FROM biometric_credentials WHERE id = ?').get(credentialId) as any;
    if (!cred) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    const nowIso = getCurrentTimestamp();

    db.prepare(`
      UPDATE biometric_credentials
      SET is_revoked = 1, revoked_at = ?, revoked_reason = ?
      WHERE id = ?
    `).run(nowIso, reason || 'Revoked by administrator', credentialId);

    // Audit log
    const auditId = `AUD-${Date.now()}`;
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, username, action, target_type, target_id, details, timestamp)
      VALUES (?, ?, ?, 'CREDENTIAL_REVOKED', 'CREDENTIAL', ?, ?, ?)
    `).run(
      auditId,
      session.userId,
      session.username,
      credentialId,
      JSON.stringify({ memberId: cred.member_id, reason: reason || 'Revoked by administrator' }),
      nowIso
    );

    return NextResponse.json({
      success: true,
      message: 'Biometric credential revoked successfully.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
