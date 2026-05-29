import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/database.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ completed: false });

    await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE`).catch(() => {});

    const result = await query(
      `SELECT onboarding_completed FROM customers WHERE clerk_user_id = $1 LIMIT 1`,
      [userId]
    );

    const completed = result.rows[0]?.onboarding_completed === true;
    return NextResponse.json({ completed });
  } catch {
    // If anything fails, don't block the dashboard
    return NextResponse.json({ completed: true });
  }
}
