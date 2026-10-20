import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/db/seed';
import { getSessionUser } from '@/lib/auth/session';

export async function POST() {
  try {
    const session = await getSessionUser();
    // Allow unauthenticated seed in development, or if user is ADMIN
    if (session && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only Administrators can reset the database.' }, { status: 403 });
    }

    const result = await seedDatabase();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
