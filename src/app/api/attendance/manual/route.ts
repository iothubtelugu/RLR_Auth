import { NextResponse } from 'next/server';
import { getSessionUser, hasPermission } from '@/lib/auth/session';
import { AttendanceService } from '@/lib/attendance/service';

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!hasPermission(session.role, 'CORRECT_ATTENDANCE')) {
      return NextResponse.json({ error: 'Permission denied: Attendance correction requires Administrator or Coordinator role' }, { status: 403 });
    }

    const body = await request.json();
    const { memberId, action, reason } = body;

    if (!memberId || !action || !reason) {
      return NextResponse.json({ error: 'memberId, action (FORCE_ENTRY | FORCE_EXIT), and reason are required' }, { status: 400 });
    }

    if (action !== 'FORCE_ENTRY' && action !== 'FORCE_EXIT') {
      return NextResponse.json({ error: 'Action must be either FORCE_ENTRY or FORCE_EXIT' }, { status: 400 });
    }

    const result = AttendanceService.manualCorrection({
      memberId,
      action,
      reason,
      adminUserId: session.userId,
      adminUsername: session.username,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
