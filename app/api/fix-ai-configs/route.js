import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔧 Fixing ai_configs table structure...');
    
    // Dynamic import
    const { query } = await import('../../../lib/database.js');
    
    // Check current table structure
    console.log('🔍 Checking current ai_configs table structure...');
    try {
      const tableInfo = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'ai_configs'
        ORDER BY ordinal_position;
      `);
      
      console.log('📊 Current columns:', tableInfo.rows.map(r => r.column_name));
      
      const hasUserId = tableInfo.rows.some(row => row.column_name === 'user_id');
      
      if (hasUserId) {
        return NextResponse.json({
          success: true,
          message: 'ai_configs table already has user_id column ✅',
          columns: tableInfo.rows.map(r => r.column_name)
        });
      }
      
      // Add missing user_id column
      console.log('➕ Adding user_id column to ai_configs table...');
      await query(`
        ALTER TABLE ai_configs 
        ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT 'migration_user';
      `);
      
      // Make user_id unique after adding it
      console.log('🔧 Adding unique constraint to user_id...');
      await query(`
        ALTER TABLE ai_configs 
        ADD CONSTRAINT ai_configs_user_id_unique UNIQUE (user_id);
      `);
      
      // Update the default constraint to remove default value for future inserts
      console.log('🔧 Removing default value from user_id...');
      await query(`
        ALTER TABLE ai_configs 
        ALTER COLUMN user_id DROP DEFAULT;
      `);
      
      // Check final structure
      const finalTableInfo = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'ai_configs'
        ORDER BY ordinal_position;
      `);
      
      console.log('✅ ai_configs table fixed successfully!');
      
      return NextResponse.json({
        success: true,
        message: 'ai_configs table fixed successfully! ✅',
        before: tableInfo.rows.map(r => r.column_name),
        after: finalTableInfo.rows.map(r => r.column_name),
        changes: [
          'Added user_id VARCHAR(255) NOT NULL column',
          'Added unique constraint on user_id',
          'Existing data preserved with default user_id'
        ]
      });
      
    } catch (tableError) {
      console.error('❌ Table structure error:', tableError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fix table structure',
        details: tableError.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Fix failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Fix failed'
    }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
