import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser, hasPermission } from '@/lib/auth/session';
import { Member } from '@/lib/db/schema';
import { getCurrentTimestamp, getZonedDateString } from '@/lib/utils/timezone';

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const department = searchParams.get('department');
    const academicYear = searchParams.get('academicYear');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        m.*,
        c.id as credential_id,
        c.credential_reference,
        c.is_revoked as credential_is_revoked,
        c.quality_score as credential_quality,
        c.enrolled_at as credential_enrolled_at,
        (SELECT COUNT(*) FROM attendance_events WHERE member_id = m.id AND event_type = 'ENTRY') as total_visits,
        (SELECT COALESCE(SUM(duration_minutes), 0) FROM attendance_sessions WHERE member_id = m.id AND status = 'COMPLETED') as total_minutes_recorded
      FROM members m
      LEFT JOIN biometric_credentials c ON m.id = c.member_id AND c.is_revoked = 0
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search.trim()) {
      query += ` AND (m.full_name LIKE ? OR m.id LIKE ? OR m.roll_number LIKE ? OR m.email LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (department) {
      query += ` AND m.department = ?`;
      params.push(department);
    }

    if (academicYear) {
      query += ` AND m.academic_year = ?`;
      params.push(academicYear);
    }

    if (category) {
      query += ` AND m.category = ?`;
      params.push(category);
    }

    if (status) {
      query += ` AND m.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY m.created_at DESC`;

    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const totalCount = (db.prepare(countQuery).get(...params) as { total: number }).total;

    const pagedQuery = `${query} LIMIT ? OFFSET ?`;
    const members = db.prepare(pagedQuery).all(...params, limit, offset);

    return NextResponse.json({
      success: true,
      data: members,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
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

    if (!hasPermission(session.role, 'MANAGE_MEMBERS')) {
      return NextResponse.json({ error: 'Permission denied: Requires Administrator or Coordinator role' }, { status: 403 });
    }

    const body = await request.json();
    const { id, full_name, email, phone, department, academic_year, roll_number, category, status, notes, photo_url } = body;

    if (!full_name || !department || !academic_year || !category) {
      return NextResponse.json({ error: 'full_name, department, academic_year, and category are required' }, { status: 400 });
    }

    const db = getDb();
    const nowIso = getCurrentTimestamp();
    const today = getZonedDateString();

    // Generate member ID if not provided, or ensure uniqueness
    let memberId = id?.trim();
    if (!memberId) {
      const yearPrefix = new Date().getFullYear();
      const countRow = db.prepare('SELECT COUNT(*) as c FROM members').get() as { c: number };
      const nextNum = (countRow.c + 1).toString().padStart(3, '0');
      memberId = `RLR-${yearPrefix}-${nextNum}`;
    } else {
      const existing = db.prepare('SELECT id FROM members WHERE id = ?').get(memberId);
      if (existing) {
        return NextResponse.json({ error: `Member ID "${memberId}" already exists. Please choose a unique ID.` }, { status: 409 });
      }
    }

    const insert = db.prepare(`
      INSERT INTO members (
        id, full_name, email, phone, department, academic_year, roll_number,
        category, status, photo_url, is_inside, registration_date, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
    `);

    insert.run(
      memberId,
      full_name.trim(),
      email?.trim() || null,
      phone?.trim() || null,
      department,
      academic_year,
      roll_number?.trim() || null,
      category,
      status || 'ACTIVE',
      photo_url || null,
      today,
      notes || null,
      nowIso,
      nowIso
    );

    // Audit log
    const auditId = `AUD-${Date.now()}`;
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, username, action, target_type, target_id, details, timestamp)
      VALUES (?, ?, ?, 'MEMBER_CREATED', 'MEMBER', ?, ?, ?)
    `).run(
      auditId,
      session.userId,
      session.username,
      memberId,
      JSON.stringify({ name: full_name, department, category }),
      nowIso
    );

    const createdMember = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
    return NextResponse.json({ success: true, member: createdMember }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
