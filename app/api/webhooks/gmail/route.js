import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getDbClient } from '../../../../lib/database.js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    console.log('📧 Gmail webhook received');

    // For now, just return success since we haven't set up Pub/Sub yet
    // This endpoint will be used later when we implement real-time notifications
    
    return NextResponse.json({ 
      success: true,
      message: 'Gmail webhook endpoint ready (Pub/Sub not configured yet)' 
    });

  } catch (error) {
    console.error('❌ Gmail webhook error:', error);
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      details: error.message 
    }, { status: 500 });
  }
}

// For testing purposes, allow GET requests
export async function GET(request) {
  return NextResponse.json({ 
    message: 'Gmail webhook endpoint is active',
    note: 'This endpoint will receive Gmail notifications when Pub/Sub is configured'
  });
}
