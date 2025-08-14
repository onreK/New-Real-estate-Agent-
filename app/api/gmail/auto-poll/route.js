// app/api/gmail/auto-poll/route.js - ULTRA MINIMAL TEST VERSION
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  console.log('🔄 AUTO-POLL ROUTE CALLED - BASIC TEST');
  
  try {
    // Just return success without doing anything
    return NextResponse.json({
      success: true,
      message: 'Auto-poll route is working!',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Auto-poll basic error:', error);
    
    return NextResponse.json({ 
      success: false,
      error: 'Auto-poll basic error',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Auto-poll GET test - route exists',
    status: 'working'
  });
}
