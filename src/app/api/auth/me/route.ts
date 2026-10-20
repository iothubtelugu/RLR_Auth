import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { User } from '@/lib/db/schema';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const db = getDb();
    const user = db.prepare('SELECT id, username, full_name, email, role, is_active FROM users WHERE id = ?').get(session.userId) as User | undefined;

    if (!user || user.is_active !== 1) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        email: user.email,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}
