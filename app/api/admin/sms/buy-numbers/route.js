import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import twilio from 'twilio';
import { query } from '@/lib/database.js';

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

async function isAdmin(userId) {
  if (!userId) return false;
  try {
    const { clerkClient } = await import('@clerk/nextjs/server');
    const user = await clerkClient.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;
    return email === 'kernopay@gmail.com' || email === process.env.ADMIN_EMAIL;
  } catch {
    return false;
  }
}

// POST: buy N numbers and add them to the pool
// Body: { quantity: 5, areaCode: "404" (optional) }
export async function POST(request) {
  try {
    const { userId } = auth();
    if (!(await isAdmin(userId))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!twilioClient) return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 });

    const { quantity = 5, areaCode } = await request.json();

    await query(`
      CREATE TABLE IF NOT EXISTS customer_phone_numbers (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER,
        clerk_user_id TEXT,
        phone_number TEXT UNIQUE NOT NULL,
        twilio_sid TEXT,
        friendly_name TEXT,
        status TEXT DEFAULT 'available',
        assigned_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    const purchased = [];
    const failed = [];

    for (let i = 0; i < Math.min(quantity, 20); i++) {
      try {
        const searchParams = { smsEnabled: true, limit: 1 };
        if (areaCode) searchParams.areaCode = areaCode;

        const found = await twilioClient.availablePhoneNumbers('US').local.list(searchParams);
        if (!found.length) { failed.push('No available numbers found'); continue; }

        const bought = await twilioClient.incomingPhoneNumbers.create({
          phoneNumber: found[0].phoneNumber,
          smsUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/sms/webhook`,
          smsMethod: 'POST',
          friendlyName: `BizzyBot Pool`
        });

        await query(
          `INSERT INTO customer_phone_numbers (phone_number, twilio_sid, friendly_name, status)
           VALUES ($1, $2, $3, 'available') ON CONFLICT (phone_number) DO NOTHING`,
          [bought.phoneNumber, bought.sid, bought.friendlyName]
        );

        purchased.push(bought.phoneNumber);
        console.log(`✅ Bought ${bought.phoneNumber} for pool`);
      } catch (err) {
        console.error(`❌ Failed to buy number:`, err.message);
        failed.push(err.message);
      }
    }

    return NextResponse.json({ success: true, purchased: purchased.length, numbers: purchased, failed });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: check pool status (how many available vs assigned)
export async function GET() {
  try {
    const { userId } = auth();
    if (!(await isAdmin(userId))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'available') as available,
        COUNT(*) FILTER (WHERE status = 'active')    as assigned,
        COUNT(*)                                     as total
      FROM customer_phone_numbers
    `).catch(() => ({ rows: [{ available: 0, assigned: 0, total: 0 }] }));

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
