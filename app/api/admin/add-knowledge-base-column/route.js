// app/api/admin/add-knowledge-base-column/route.js - Simple Database Fix
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('🔧 Adding knowledge_base column to email_settings table...');
    
    // Dynamic import to match your structure
    const { query } = await import('../../../../lib/database.js');
    
    // Check if knowledge_base column already exists
    const columnExists = await query(`
      SELECT EXISTS (
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'email_settings' AND column_name = 'knowledge_base'
      )
    `);
    
    if (columnExists.rows[0].exists) {
      console.log('✅ knowledge_base column already exists');
      return NextResponse.json({
        success: true,
        message: 'knowledge_base column already exists in email_settings table',
        action: 'none'
      });
    }
    
    // Add knowledge_base column
    console.log('➕ Adding knowledge_base column...');
    await query(`
      ALTER TABLE email_settings 
      ADD COLUMN knowledge_base TEXT DEFAULT ''
    `);
    
    console.log('✅ knowledge_base column added successfully');
    
    return NextResponse.json({
      success: true,
      message: 'knowledge_base column added successfully to email_settings table!',
      nextSteps: [
        '1. Your centralized AI service can now access knowledge_base data',
        '2. All channels will use the same business knowledge',
        '3. Test your Gmail, SMS, Facebook, and Chat channels',
        '4. Update knowledge base in email settings to see it work across all channels'
      ]
    });
    
  } catch (error) {
    console.error('❌ Database update failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: 'Failed to add knowledge_base column to email_settings table'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { query } = await import('../../../../lib/database.js');
    
    // Check if knowledge_base column exists
    const hasKnowledgeBase = await query(`
      SELECT EXISTS (
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'email_settings' AND column_name = 'knowledge_base'
      )
    `);
    
    return NextResponse.json({
      hasKnowledgeBase: hasKnowledgeBase.rows[0].exists,
      status: hasKnowledgeBase.rows[0].exists 
        ? 'Ready for centralized AI service' 
        : 'Needs knowledge_base column',
      action: hasKnowledgeBase.rows[0].exists ? 'No action needed' : 'Run POST to add column'
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
