import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateCsv } from '@/lib/utils/csv';
import { formatDateIST } from '@/lib/utils/timezone';

export async function GET(request: Request) {
  try {
    const db = getDb();
    const members = db
      .prepare(
        `SELECT 
          m.*,
          c.credential_reference,
          (SELECT COUNT(*) FROM attendance_events WHERE member_id = m.id AND event_type = 'ENTRY') as total_visits
        FROM members m
        LEFT JOIN biometric_credentials c ON m.id = c.member_id AND c.is_revoked = 0
        ORDER BY m.id ASC`
      )
      .all() as any[];

    const headers = [
      'Member ID',
      'Full Name',
      'Department',
      'Academic Year',
      'Roll Number',
      'Category',
      'Status',
      'Currently Inside',
      'Biometric Enrolled',
      'Credential Reference',
      'Email',
      'Phone',
      'Total Lab Visits',
      'Registration Date',
    ];

    const rows = members.map((m) => [
      m.id,
      m.full_name,
      m.department,
      m.academic_year,
      m.roll_number || '',
      m.category,
      m.status,
      m.is_inside === 1 ? 'YES' : 'NO',
      m.credential_reference ? 'YES' : 'NO',
      m.credential_reference || '',
      m.email || '',
      m.phone || '',
      m.total_visits || 0,
      formatDateIST(m.registration_date),
    ]);

    const csvData = generateCsv(headers, rows);

    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="RLR_Members_Directory_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
