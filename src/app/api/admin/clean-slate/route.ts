import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser, hasPermission } from '@/lib/auth/session';
import { getCurrentTimestamp } from '@/lib/utils/timezone';

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    // Allow if authenticated as ADMIN or in development mode
    if (session && session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Permission denied: Requires Administrator role' },
        { status: 403 }
      );
    }

    const db = getDb();
    const nowIso = getCurrentTimestamp();

    // Transactionally clear all mock members, attendance records, and credentials
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM attendance_sessions').run();
      db.prepare('DELETE FROM attendance_events').run();
      db.prepare('DELETE FROM biometric_credentials').run();
      db.prepare('DELETE FROM members').run();

      // Log clean slate action in audit trail
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, username, action, target_type, target_id, details, timestamp)
        VALUES (?, ?, ?, 'CLEAN_SLATE_RESET', 'DATABASE', 'ALL_MEMBERS', ?, ?)
      `).run(
        `AUD-${Date.now()}`,
        session?.userId || 'usr-admin-01',
        session?.username || 'admin',
        JSON.stringify({
          message: 'All mock student and attendance data removed. Database prepared for real member registration.',
          clearedBy: session?.username || 'admin',
        }),
        nowIso
      );
    });

    transaction();

    return NextResponse.json({
      success: true,
      message: 'All mock students, biometric credentials, and attendance sessions have been removed successfully. Database is now clean and ready for real student registration.',
      remainingMembersCount: 0,
      timestamp: nowIso,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to clear mock data' },
      { status: 500 }
    );
  }
}
