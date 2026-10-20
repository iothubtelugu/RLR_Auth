import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser, hasPermission } from '@/lib/auth/session';
import { parseCsv } from '@/lib/utils/csv';
import { getCurrentTimestamp, getZonedDateString } from '@/lib/utils/timezone';

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!hasPermission(session.role, 'MANAGE_MEMBERS')) {
      return NextResponse.json({ error: 'Permission denied: Requires Administrator or Coordinator role' }, { status: 403 });
    }

    const { csvContent } = await request.json();
    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json({ error: 'Valid CSV content string is required' }, { status: 400 });
    }

    const rows = parseCsv(csvContent);
    if (rows.length < 2) {
      return NextResponse.json({ error: 'CSV file must contain a header row and at least one data row' }, { status: 400 });
    }

    const header = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    // Expected header tokens: id/memberid, name/fullname, email, phone, dept/department, year/academicyear, roll/rollnumber, category, status
    const idIdx = header.findIndex((h) => h.includes('id'));
    const nameIdx = header.findIndex((h) => h.includes('name'));
    const deptIdx = header.findIndex((h) => h.includes('dept') || h.includes('branch'));
    const yearIdx = header.findIndex((h) => h.includes('year'));
    const rollIdx = header.findIndex((h) => h.includes('roll'));
    const emailIdx = header.findIndex((h) => h.includes('email'));
    const phoneIdx = header.findIndex((h) => h.includes('phone') || h.includes('mobile'));
    const catIdx = header.findIndex((h) => h.includes('cat'));
    const statusIdx = header.findIndex((h) => h.includes('status'));

    if (nameIdx === -1 || deptIdx === -1) {
      return NextResponse.json(
        { error: 'CSV must contain at least "Name" and "Department" columns.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const nowIso = getCurrentTimestamp();
    const today = getZonedDateString();

    const insertStmt = db.prepare(`
      INSERT INTO members (
        id, full_name, email, phone, department, academic_year, roll_number,
        category, status, is_inside, registration_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `);

    let importedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ row: number; error: string; data: any }> = [];

    const transaction = db.transaction(() => {
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 0 || row.every((c) => !c.trim())) continue;

        const name = row[nameIdx]?.trim();
        const dept = row[deptIdx]?.trim();
        const year = (yearIdx !== -1 ? row[yearIdx] : 'Year 1')?.trim() || 'Year 1';
        const roll = (rollIdx !== -1 ? row[rollIdx] : '')?.trim() || null;
        const email = (emailIdx !== -1 ? row[emailIdx] : '')?.trim() || null;
        const phone = (phoneIdx !== -1 ? row[phoneIdx] : '')?.trim() || null;
        const cat = (catIdx !== -1 ? row[catIdx] : 'Student Member')?.trim() || 'Student Member';
        const status = (statusIdx !== -1 ? row[statusIdx] : 'ACTIVE')?.trim()?.toUpperCase() || 'ACTIVE';

        if (!name || !dept) {
          errors.push({ row: i + 1, error: 'Missing name or department', data: row });
          skippedCount++;
          continue;
        }

        let id = idIdx !== -1 ? row[idIdx]?.trim() : '';
        if (!id) {
          const countRow = db.prepare('SELECT COUNT(*) as c FROM members').get() as { c: number };
          id = `RLR-${new Date().getFullYear()}-${(countRow.c + 1 + importedCount).toString().padStart(3, '0')}`;
        } else {
          const exists = db.prepare('SELECT id FROM members WHERE id = ?').get(id);
          if (exists) {
            errors.push({ row: i + 1, error: `Member ID "${id}" already exists`, data: row });
            skippedCount++;
            continue;
          }
        }

        insertStmt.run(id, name, email, phone, dept, year, roll, cat, status, today, nowIso, nowIso);
        importedCount++;
      }
    });

    transaction();

    // Log in audit
    const auditId = `AUD-${Date.now()}`;
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, username, action, target_type, target_id, details, timestamp)
      VALUES (?, ?, ?, 'MEMBERS_IMPORTED', 'MEMBER', 'batch', ?, ?)
    `).run(
      auditId,
      session.userId,
      session.username,
      JSON.stringify({ imported: importedCount, skipped: skippedCount, errorsCount: errors.length }),
      nowIso
    );

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: rows.length - 1,
        imported: importedCount,
        skipped: skippedCount,
        errors,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
