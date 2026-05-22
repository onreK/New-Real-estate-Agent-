import { auth } from '@clerk/nextjs/server';
import { getMonthlyUsage } from '../../../../lib/usage.js';

export async function GET() {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const usage = await getMonthlyUsage(userId);
  return Response.json(usage);
}
