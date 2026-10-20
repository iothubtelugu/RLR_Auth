import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateCsv } from '@/lib/utils/csv';
import { formatDateTimeIST, formatTimeIST } from '@/lib/utils/timezone';

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);

    const view = searchParams.get('view') || 'events'; // 'events' or 'sessions'
    const search = searchParams.get('search') || '';
    const eventType = searchParams.get('eventType'); // 'ENTRY', 'EXIT'
    const department = searchParams.get('department');
    const academicYear = searchParams.get('academicYear');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const verificationSource = searchParams.get('verificationSource');
    const exceptionsOnly = searchParams.get('exceptionsOnly') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const offset = (page - 1) * limit;
    const format = searchParams.get('format'); // 'csv' or null

    if (view === 'sessions') {
      // Attendance Sessions View
      let query = `
        SELECT 
          s.id,
          s.member_id,
          m.full_name as member_name,
          m.department,
          m.academic_year,
          m.category,
          s.session_date,
          s.entry_time,
          s.exit_time,
          s.duration_minutes,
          s.status,
          s.is_overnight,
          s.notes
        FROM attendance_sessions s
        JOIN members m ON s.member_id = m.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (search.trim()) {
        query += ` AND (m.full_name LIKE ? OR m.id LIKE ?)`;
        const term = `%${search.trim()}%`;
        params.push(term, term);
      }

      if (department) {
        query += ` AND m.department = ?`;
        params.push(department);
      }

      if (startDate) {
        query += ` AND s.session_date >= ?`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND s.session_date <= ?`;
        params.push(endDate);
      }

      if (exceptionsOnly) {
        query += ` AND (s.is_overnight = 1 OR s.status = 'ACTIVE' OR s.status = 'MANUALLY_CLOSED')`;
      }

      query += ` ORDER BY s.entry_time DESC`;

      if (format === 'csv') {
        const rows = db.prepare(query).all(...params) as any[];
        const headers = [
          'Session ID',
          'Member ID',
          'Member Name',
          'Department',
          'Date',
          'First Entry Time (IST)',
          'Last Exit Time (IST)',
          'Duration (Minutes)',
          'Session Status',
          'Notes',
        ];
        const csvRows = rows.map((r) => [
          r.id,
          r.member_id,
          r.member_name,
          r.department,
          r.session_date,
          formatDateTimeIST(r.entry_time),
          formatDateTimeIST(r.exit_time),
          r.duration_minutes !== null ? r.duration_minutes : 'In Progress',
          r.status,
          r.notes || '',
        ]);
        const csvData = generateCsv(headers, csvRows);
        return new NextResponse(csvData, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="RLR_Attendance_Sessions_${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      // Count
      const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
      const totalCount = (db.prepare(countQuery).get(...params) as { total: number }).total;

      const pagedQuery = `${query} LIMIT ? OFFSET ?`;
      const sessions = db.prepare(pagedQuery).all(...params, limit, offset);

      return NextResponse.json({
        success: true,
        data: sessions,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    }

    // Default Events View
    let query = `
      SELECT 
        e.id,
        e.member_id,
        m.full_name as member_name,
        m.department,
        m.academic_year,
        m.category,
        m.photo_url,
        e.event_type,
        e.timestamp,
        e.event_date,
        e.verification_source,
        e.device_id,
        e.is_corrected,
        e.correction_reason,
        e.notes,
        d.device_name
      FROM attendance_events e
      JOIN members m ON e.member_id = m.id
      LEFT JOIN devices d ON e.device_id = d.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search.trim()) {
      query += ` AND (m.full_name LIKE ? OR m.id LIKE ? OR m.roll_number LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (eventType && (eventType === 'ENTRY' || eventType === 'EXIT')) {
      query += ` AND e.event_type = ?`;
      params.push(eventType);
    }

    if (department) {
      query += ` AND m.department = ?`;
      params.push(department);
    }

    if (academicYear) {
      query += ` AND m.academic_year = ?`;
      params.push(academicYear);
    }

    if (verificationSource) {
      query += ` AND e.verification_source = ?`;
      params.push(verificationSource);
    }

    if (startDate) {
      query += ` AND e.event_date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND e.event_date <= ?`;
      params.push(endDate);
    }

    if (exceptionsOnly) {
      query += ` AND e.is_corrected = 1`;
    }

    query += ` ORDER BY e.timestamp DESC`;

    if (format === 'csv') {
      const rows = db.prepare(query).all(...params) as any[];
      const headers = [
        'Event ID',
        'Member ID',
        'Member Name',
        'Department',
        'Academic Year',
        'Action',
        'Date',
        'Time (IST)',
        'Verification Source',
        'Device',
        'Is Corrected',
        'Correction Reason',
        'Notes',
      ];
      const csvRows = rows.map((r) => [
        r.id,
        r.member_id,
        r.member_name,
        r.department,
        r.academic_year,
        r.event_type,
        r.event_date,
        formatTimeIST(r.timestamp),
        r.verification_source,
        r.device_name || 'Entrance Scanner',
        r.is_corrected ? 'YES' : 'NO',
        r.correction_reason || '',
        r.notes || '',
      ]);
      const csvData = generateCsv(headers, csvRows);
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="RLR_Attendance_Log_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Pagination
    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const totalCount = (db.prepare(countQuery).get(...params) as { total: number }).total;

    const pagedQuery = `${query} LIMIT ? OFFSET ?`;
    const events = db.prepare(pagedQuery).all(...params, limit, offset);

    return NextResponse.json({
      success: true,
      data: events,
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
