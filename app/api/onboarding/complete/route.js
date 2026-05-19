import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/database.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessName, businessDescription, targetAudience, industry } = await request.json();

    if (!businessName?.trim()) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 });
    }

    // 1. Update the customer's business name in the customers table
    await query(
      `UPDATE customers SET business_name = $1, updated_at = NOW() WHERE clerk_user_id = $2`,
      [businessName.trim(), userId]
    );

    // Build the initial AI knowledge base from what the user entered
    const industryLine = industry ? `Industry: ${industry}\n` : '';
    const audienceLine = targetAudience ? `Target audience: ${targetAudience}\n` : '';
    const knowledgeBase = `${businessDescription}\n\n${industryLine}${audienceLine}`.trim();

    // 2. Seed ai_configs so the AI is ready to go from day one
    const existing = await query(
      `SELECT id FROM ai_configs WHERE user_id = $1`,
      [userId]
    );

    if (existing.rows.length > 0) {
      // Only fill in blanks — don't overwrite if the user already configured their AI
      await query(
        `UPDATE ai_configs
         SET business_name = COALESCE(NULLIF(business_name, ''), NULLIF(business_name, 'My Business'), $1),
             business_info  = CASE WHEN business_info IS NULL OR business_info = '' THEN $2 ELSE business_info END,
             knowledge_base = CASE WHEN knowledge_base IS NULL OR knowledge_base = '' THEN $3 ELSE knowledge_base END,
             updated_at = NOW()
         WHERE user_id = $4`,
        [businessName.trim(), businessDescription || '', knowledgeBase, userId]
      );
    } else {
      await query(
        `INSERT INTO ai_configs
           (user_id, business_name, personality, business_info, model, creativity, response_length, knowledge_base)
         VALUES ($1, $2, 'professional', $3, 'gpt-4o-mini', 0.7, 500, $4)`,
        [userId, businessName.trim(), businessDescription || '', knowledgeBase]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Onboarding complete error:', error);
    return NextResponse.json({ error: 'Failed to save onboarding data', details: error.message }, { status: 500 });
  }
}
