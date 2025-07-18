// app/api/test/route.js
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'POST API is working!',
    timestamp: new Date().toISOString()
  });
}
