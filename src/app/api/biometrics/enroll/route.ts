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
    const { memberId, fingerPosition, credentialReference, qualityScore, replaceExisting } = body;

    if (!memberId || !credentialReference) {
      return NextResponse.json({ error: 'memberId and credentialReference are required' }, { status: 400 });
    }

    const db = getDb();
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const nowIso = getCurrentTimestamp();

    const transaction = db.transaction(() => {
      // If replacing existing, mark older credentials as revoked
      if (replaceExisting) {
        db.prepare(
          `UPDATE biometric_credentials 
           SET is_revoked = 1, revoked_at = ?, revoked_reason = 'Replaced with newly enrolled fingerprint'
           WHERE member_id = ? AND is_revoked = 0`
        ).run(nowIso, memberId);
      }

      const credId = `BIO-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      db.prepare(
        `INSERT INTO biometric_credentials (
          id, member_id, device_id, credential_reference, finger_position,
          quality_score, is_revoked, enrolled_by_user_id, enrolled_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
      ).run(
        credId,
        memberId,
        'dev-rlr-kiosk-01',
        credentialReference.trim(),
        fingerPosition || 'RIGHT_INDEX',
        qualityScore || 95,
        session.userId,
        nowIso
      );

      // Log in audit trail
      const auditId = `AUD-${Date.now()}`;
      db.prepare(
        `INSERT INTO audit_logs (id, user_id, username, action, target_type, target_id, details, timestamp)
         VALUES (?, ?, ?, 'CREDENTIAL_ENROLLED', 'CREDENTIAL', ?, ?, ?)`
      ).run(
        auditId,
        session.userId,
        session.username,
        credId,
        JSON.stringify({ memberId, credentialReference, fingerPosition, qualityScore }),
        nowIso
      );

      return credId;
    });

    const newCredId = transaction();
    const createdCred = db.prepare('SELECT * FROM biometric_credentials WHERE id = ?').get(newCredId);

    return NextResponse.json({
      success: true,
      message: 'Fingerprint enrolled and linked to member successfully.',
      credential: createdCred,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
