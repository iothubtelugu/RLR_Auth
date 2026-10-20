import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateCsv } from '@/lib/utils/csv';
import { formatDateTimeIST, formatDurationElapsed } from '@/lib/utils/timezone';

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const academicYear = searchParams.get('academicYear') || '';
    const category = searchParams.get('category') || '';
    const sortOrder = searchParams.get('sort') || 'ASC'; // 'ASC' or 'DESC'
    const format = searchParams.get('format'); // 'csv' or null

    let query = `
      SELECT 
        m.id,
        m.full_name,
        m.email,
        m.phone,
        m.department,
        m.academic_year,
        m.roll_number,
        m.category,
        m.photo_url,
        m.last_entry_time,
        m.current_session_id,
        s.status as session_status,
        e.verification_source,
        e.timestamp as verification_timestamp
      FROM members m
      LEFT JOIN attendance_sessions s ON m.current_session_id = s.id
      LEFT JOIN attendance_events e ON s.entry_event_id = e.id
      WHERE m.is_inside = 1
    `;

    const params: any[] = [];

    if (search.trim()) {
      query += ` AND (m.full_name LIKE ? OR m.id LIKE ? OR m.roll_number LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
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

    query += ` ORDER BY m.last_entry_time ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}`;

    const membersInside = db.prepare(query).all(...params) as any[];

    if (format === 'csv') {
      const headers = [
        'Member ID',
        'Full Name',
        'Department',
        'Academic Year',
        'Roll Number',
        'Category',
        'Entry Time (IST)',
        'Time Spent Inside',
        'Verification Source',
      ];

      const rows = membersInside.map((m) => [
        m.id,
        m.full_name,
        m.department,
        m.academic_year,
        m.roll_number || '',
        m.category,
        formatDateTimeIST(m.last_entry_time),
        formatDurationElapsed(m.last_entry_time),
        m.verification_source || 'FINGERPRINT_HARDWARE',
      ]);

      const csvData = generateCsv(headers, rows);
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="RLR_Currently_Inside_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      count: membersInside.length,
      occupants: membersInside,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
