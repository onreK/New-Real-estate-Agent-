// app/api/admin/add-ai-behavior-columns/route.js - Add AI Behavior & Model Settings Columns
import { NextResponse } from 'next/server';
import { getDbClient } from '../../../../lib/database';

export async function POST() {
  const client = await getDbClient().connect();
  
  try {
    console.log('🔄 Adding AI Behavior and Model Settings columns to email_settings table...');

    // Define all the new columns for AI Behavior and Model Settings
    const newColumns = [
      // 🎯 AI Behavior Settings columns
      { name: 'custom_instructions', type: 'TEXT DEFAULT \'\'' },
      { name: 'always_ask_phone', type: 'BOOLEAN DEFAULT false' },
      { name: 'schedule_within_24h', type: 'BOOLEAN DEFAULT false' },
      { name: 'highlight_advantages', type: 'BOOLEAN DEFAULT false' },
      { name: 'include_call_to_action', type: 'BOOLEAN DEFAULT true' },
      { name: 'offer_callback_urgent', type: 'BOOLEAN DEFAULT true' },
      
      // ⚙️ AI Model Settings columns (some might already exist)
      { name: 'ai_max_tokens', type: 'INTEGER DEFAULT 350' },
      { name: 'response_length', type: 'VARCHAR(50) DEFAULT \'medium\'' },
      { name: 'enable_hot_lead_analysis', type: 'BOOLEAN DEFAULT true' },
      { name: 'enable_ai_responses', type: 'BOOLEAN DEFAULT true' }
    ];

    let addedColumns = [];
    let existingColumns = [];

    // Add each column if it doesn't exist
    for (const column of newColumns) {
      try {
        await client.query(`ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
        
        // Check if column was actually added by verifying it exists
        const checkColumn = await client.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'email_settings' AND column_name = $1
        `, [column.name]);
        
        if (checkColumn.rows.length > 0) {
          addedColumns.push(column.name);
          console.log(`✅ Added/verified column: ${column.name}`);
        }
        
      } catch (error) {
        if (error.message.includes('already exists')) {
          existingColumns.push(column.name);
          console.log(`⚠️ Column ${column.name} already exists`);
        } else {
          console.error(`❌ Error adding column ${column.name}:`, error.message);
          throw error;
        }
      }
    }

    // Verify all columns exist in the final table
    console.log('🔍 Verifying final table structure...');
    const finalColumns = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'email_settings'
      ORDER BY ordinal_position
    `);
    
    const columnNames = finalColumns.rows.map(row => row.column_name);
    const aiColumns = columnNames.filter(name => 
      name.includes('ai_') || 
      ['custom_instructions', 'always_ask_phone', 'schedule_within_24h', 
       'highlight_advantages', 'include_call_to_action', 'offer_callback_urgent',
       'response_length', 'enable_hot_lead_analysis', 'enable_ai_responses'].includes(name)
    );

    console.log('✅ AI Behavior & Model Settings columns migration completed!');
    
    return NextResponse.json({
      success: true,
      message: 'AI Behavior and Model Settings columns added successfully!',
      summary: {
        columns_added: addedColumns,
        columns_already_existed: existingColumns,
        total_ai_columns: aiColumns.length,
        ai_columns: aiColumns
      },
      next_steps: [
        '1. Replace your AI Settings page with the enhanced version',
        '2. Replace your AI Settings API with the updated version',
        '3. Deploy to Railway',
        '4. Test the new AI Behavior and Model Settings sections'
      ],
      table_info: {
        name: 'email_settings',
        total_columns: columnNames.length,
        ai_related_columns: aiColumns
      }
    });

  } catch (error) {
    console.error('❌ Error adding AI Behavior and Model Settings columns:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to add AI Behavior and Model Settings columns',
      details: error.message,
      suggestion: 'Check database connection and table permissions'
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
    
    const columns = result.rows.map(row => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      default: row.column_default
    }));
    
    // Check which AI columns exist
    const requiredAIColumns = [
      'ai_personality', 'ai_system_prompt', 'custom_instructions',
      'always_ask_phone', 'schedule_within_24h', 'highlight_advantages',
      'include_call_to_action', 'offer_callback_urgent',
      'ai_model', 'ai_temperature', 'ai_max_tokens', 'response_length',
      'enable_hot_lead_analysis', 'enable_ai_responses'
    ];
    
    const existingAIColumns = columns.filter(col => 
      requiredAIColumns.includes(col.name)
    ).map(col => col.name);
    
    const missingAIColumns = requiredAIColumns.filter(col => 
      !existingAIColumns.includes(col)
    );
    
    return NextResponse.json({
      success: true,
      table: 'email_settings',
      total_columns: columns.length,
      all_columns: columns.map(col => col.name),
      ai_columns: {
        existing: existingAIColumns,
        missing: missingAIColumns,
        total_required: requiredAIColumns.length,
        ready_for_ai_settings: missingAIColumns.length === 0
      },
      status: missingAIColumns.length === 0 
        ? 'Ready for enhanced AI settings' 
        : `Missing ${missingAIColumns.length} AI columns`,
      action_needed: missingAIColumns.length > 0 
        ? 'Run POST to add missing AI columns' 
        : 'No action needed - all AI columns exist'
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
