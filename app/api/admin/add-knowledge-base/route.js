// app/api/admin/add-knowledge-base/route.js
import { NextResponse } from 'next/server';
import { getDbClient } from '../../../../lib/database';

export async function POST() {
  const client = await getDbClient().connect();
  
  try {
    console.log('🔄 Adding knowledge_base column to email_settings table...');

    // Add the knowledge_base column to existing email_settings table
    await client.query(`
      ALTER TABLE email_settings 
      ADD COLUMN IF NOT EXISTS knowledge_base TEXT
    `);
    console.log('✅ Added knowledge_base column to email_settings');

    // Check if the column was added successfully
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'email_settings' AND column_name = 'knowledge_base'
    `);
    
    const hasKnowledgeBase = columnCheck.rows.length > 0;
    
    if (hasKnowledgeBase) {
      console.log('✅ Knowledge base column verified successfully');
      
      return NextResponse.json({
        success: true,
        message: 'Knowledge base column added successfully!',
        column_added: true,
        next_steps: [
          '1. Deploy your updated code to Railway',
          '2. Go to your Email AI Manager',
          '3. Navigate to AI Settings tab',
          '4. You should see the new Business Knowledge Base section'
        ]
      });
    } else {
      throw new Error('Knowledge base column was not created properly');
    }

  } catch (error) {
    console.error('❌ Error adding knowledge base column:', error);
    
    if (error.message.includes('already exists')) {
      return NextResponse.json({
        success: true,
        message: 'Knowledge base column already exists!',
        column_added: true,
        note: 'Column was previously added, no changes needed'
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to add knowledge base column',
      details: error.message
    }, { status: 500 });
    
  } finally {
    client.release();
  }
}

export async function GET() {
  const client = await getDbClient().connect();
  
  try {
    // Check current email_settings table structure
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'email_settings'
      ORDER BY ordinal_position
    `);
    
    const columns = result.rows.map(row => row.column_name);
    const hasKnowledgeBase = columns.includes('knowledge_base');
    
    return NextResponse.json({
      success: true,
      table: 'email_settings',
      columns: columns,
      has_knowledge_base: hasKnowledgeBase,
      status: hasKnowledgeBase ? 'Knowledge base column exists' : 'Knowledge base column missing',
      action_needed: hasKnowledgeBase ? 'No action needed' : 'Run POST request to add column'
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
    
  } finally {
    client.release();
  }
}
