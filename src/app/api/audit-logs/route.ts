import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser, hasPermission } from '@/lib/auth/session';

export async function GET(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!hasPermission(session.role, 'VIEW_AUDIT_LOGS')) {
      return NextResponse.json({ error: 'Permission denied: Requires Administrator or Coordinator role' }, { status: 403 });
    }

    const db = getDb();
    const { searchParams } = new URL(request.url);

    const action = searchParams.get('action');
    const targetType = searchParams.get('targetType');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }

    if (targetType) {
      query += ' AND target_type = ?';
      params.push(targetType);
    }

    if (search?.trim()) {
      query += ' AND (username LIKE ? OR target_id LIKE ? OR details LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY timestamp DESC';

    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const totalCount = (db.prepare(countQuery).get(...params) as { total: number }).total;

    const pagedQuery = `${query} LIMIT ? OFFSET ?`;
    const logs = db.prepare(pagedQuery).all(...params, limit, offset);

    return NextResponse.json({
      success: true,
      data: logs,
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
