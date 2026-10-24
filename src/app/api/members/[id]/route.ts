import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser, hasPermission } from '@/lib/auth/session';
import { Member, BiometricCredential } from '@/lib/db/schema';
import { getCurrentTimestamp } from '@/lib/utils/timezone';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const memberId = params.id;

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId) as Member | undefined;
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Credentials
    const credentials = db
      .prepare('SELECT * FROM biometric_credentials WHERE member_id = ? ORDER BY enrolled_at DESC')
      .all(memberId) as BiometricCredential[];

    // Recent Attendance Events
    const events = db
      .prepare('SELECT * FROM attendance_events WHERE member_id = ? ORDER BY timestamp DESC LIMIT 50')
      .all(memberId);

    // Attendance Sessions
    const sessions = db
      .prepare('SELECT * FROM attendance_sessions WHERE member_id = ? ORDER BY entry_time DESC LIMIT 50')
      .all(memberId);

    // Overall metrics
    const statsRow = db
      .prepare(
        `SELECT 
          COUNT(CASE WHEN event_type = 'ENTRY' THEN 1 END) as total_entries,
          COUNT(CASE WHEN event_type = 'EXIT' THEN 1 END) as total_exits,
          COALESCE(SUM(duration_minutes), 0) as total_minutes
        FROM attendance_sessions
        WHERE member_id = ? AND status = 'COMPLETED'`
      )
      .get(memberId) as { total_entries: number; total_exits: number; total_minutes: number };

    return NextResponse.json({
      success: true,
      member,
      credentials,
      recentEvents: events,
      recentSessions: sessions,
      statistics: {
        totalVisits: statsRow.total_entries || 0,
        totalHours: Math.round(((statsRow.total_minutes || 0) / 60) * 10) / 10,
        totalMinutes: statsRow.total_minutes || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!hasPermission(session.role, 'MANAGE_MEMBERS')) {
      return NextResponse.json({ error: 'Permission denied: Requires Administrator or Coordinator role' }, { status: 403 });
    }

    const memberId = params.id;
    const db = getDb();
    const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId) as Member | undefined;

    if (!existing) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      full_name,
      email,
      phone,
      department,
      academic_year,
      roll_number,
      category,
      status,
      notes,
      photo_url,
      fingerprint_slot,
      finger_position,
    } = body;

    const nowIso = getCurrentTimestamp();

    const update = db.prepare(`
      UPDATE members SET
        full_name = COALESCE(?, full_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        department = COALESCE(?, department),
        academic_year = COALESCE(?, academic_year),
        roll_number = COALESCE(?, roll_number),
        category = COALESCE(?, category),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        photo_url = COALESCE(?, photo_url),
        updated_at = ?
      WHERE id = ?
    `);

    update.run(
      full_name?.trim() || null,
      email?.trim() || null,
      phone?.trim() || null,
      department || null,
      academic_year || null,
      roll_number?.trim() || null,
      category || null,
      status || null,
      notes || null,
      photo_url || null,
      nowIso,
      memberId
    );

    // If fingerprint slot was updated
    if (fingerprint_slot !== undefined && fingerprint_slot !== null) {
      const slotNum = parseInt(String(fingerprint_slot), 10);
      if (!isNaN(slotNum) && slotNum > 0) {
        const credRef = `FP-RLR-2024-${slotNum.toString().padStart(3, '0')}`;
        const credId = `BIO-${memberId}`;

        // Revoke any other credential for this member
        db.prepare('UPDATE biometric_credentials SET is_revoked = 1, revoked_at = ? WHERE member_id = ?').run(
          nowIso,
          memberId
        );

        // Check if this slot was used by another member
        db.prepare('UPDATE biometric_credentials SET is_revoked = 1, revoked_at = ? WHERE credential_reference = ?').run(
          nowIso,
          credRef
        );

        // Insert new active credential
        db.prepare(`
          INSERT INTO biometric_credentials (
            id, member_id, device_id, credential_reference, finger_position,
            quality_score, is_revoked, enrolled_by_user_id, enrolled_at
          ) VALUES (?, ?, 'dev-rlr-esp32-01', ?, ?, 98, 0, ?, ?)
        `).run(
          credId,
          memberId,
          credRef,
          finger_position || 'RIGHT_INDEX',
          session.userId,
          nowIso
        );
      }
    }

    // Audit log
    const auditId = `AUD-${Date.now()}`;
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, username, action, target_type, target_id, details, timestamp)
      VALUES (?, ?, ?, 'MEMBER_UPDATED', 'MEMBER', ?, ?, ?)
    `).run(
      auditId,
      session.userId,
      session.username,
      memberId,
      JSON.stringify({ before: { status: existing.status, name: existing.full_name }, after: { status, name: full_name } }),
      nowIso
    );

    const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
    return NextResponse.json({ success: true, member: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Permission denied: Deleting members requires Administrator privileges' }, { status: 403 });
    }

    const memberId = params.id;
    const db = getDb();
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId) as Member | undefined;

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const nowIso = getCurrentTimestamp();

    const url = new URL(request.url);
    const hardDelete = url.searchParams.get('hard') === 'true' || url.searchParams.get('force') === 'true';

    if (hardDelete) {
      // Hard delete member and associated credentials
      db.prepare('DELETE FROM biometric_credentials WHERE member_id = ?').run(memberId);
      db.prepare('DELETE FROM members WHERE id = ?').run(memberId);

      // Audit log
      const auditId = `AUD-${Date.now()}`;
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, username, action, target_type, target_id, details, timestamp)
        VALUES (?, ?, ?, 'MEMBER_DELETED', 'MEMBER', ?, ?, ?)
      `).run(
        auditId,
        session.userId,
        session.username,
        memberId,
        JSON.stringify({ name: member.full_name, reason: 'Permanently deleted by administrator' }),
        nowIso
      );

      return NextResponse.json({
        success: true,
        message: `Member ${member.full_name} (${memberId}) permanently deleted.`,
      });
    }

    // Soft deactivation to protect historical attendance data (as requested in Requirement 7)
    db.prepare("UPDATE members SET status = 'INACTIVE', updated_at = ? WHERE id = ?").run(nowIso, memberId);

    // Audit log
    const auditId = `AUD-${Date.now()}`;
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, username, action, target_type, target_id, details, timestamp)
      VALUES (?, ?, ?, 'MEMBER_DEACTIVATED', 'MEMBER', ?, ?, ?)
    `).run(
      auditId,
      session.userId,
      session.username,
      memberId,
      JSON.stringify({ reason: 'Member soft-deactivated by administrator (attendance history retained)' }),
      nowIso
    );

    return NextResponse.json({
      success: true,
      message: `Member ${member.full_name} (${memberId}) deactivated. Historical records preserved.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
