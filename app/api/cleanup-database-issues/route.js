import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🧹 Starting database cleanup and fixes...');
    
    // Dynamic import
    const { query } = await import('../../../lib/database.js');
    
    const results = {
      fixes: [],
      errors: []
    };

    // Fix 1: Remove duplicate unique constraint issue
    try {
      console.log('🔧 Fixing unique constraint conflicts...');
      
      // Drop the problematic unique constraint if it exists
      await query(`
        ALTER TABLE customers 
        DROP CONSTRAINT IF EXISTS customers_user_id_unique
      `);
      
      // Update all default_user entries to have unique user_ids
      const duplicateUsers = await query(`
        SELECT id FROM customers WHERE user_id = 'default_user'
      `);
      
      if (duplicateUsers.rows.length > 0) {
        for (let i = 0; i < duplicateUsers.rows.length; i++) {
          const row = duplicateUsers.rows[i];
          await query(`
            UPDATE customers 
            SET user_id = $1 
            WHERE id = $2
          `, [`default_user_${row.id}`, row.id]);
        }
        
        results.fixes.push(`Updated ${duplicateUsers.rows.length} duplicate user_id entries in customers`);
      }
      
      // Now safely add the unique constraint
      await query(`
        ALTER TABLE customers 
        ADD CONSTRAINT customers_user_id_unique UNIQUE (user_id)
      `);
      
      results.fixes.push('Fixed customers table unique constraint');
      
    } catch (constraintError) {
      console.error('Constraint fix error:', constraintError);
      results.errors.push(`Constraint fix: ${constraintError.message}`);
    }

    // Fix 2: Add missing 'type' column to conversations table
    try {
      console.log('🔧 Adding missing type column to conversations...');
      
      // Check if type column exists
      const typeColumnExists = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'conversations' AND column_name = 'type'
        )
      `);

      if (!typeColumnExists.rows[0].exists) {
        await query(`
          ALTER TABLE conversations 
          ADD COLUMN type VARCHAR(50) DEFAULT 'general'
        `);
        results.fixes.push('Added type column to conversations table');
      } else {
        results.fixes.push('Type column already exists in conversations');
      }
      
    } catch (typeError) {
      console.error('Type column error:', typeError);
      results.errors.push(`Type column fix: ${typeError.message}`);
    }

    // Fix 3: Clean up any remaining data type issues
    try {
      console.log('🔧 Cleaning up data type issues...');
      
      // Fix any 'default' values that should be integers
      const tables = ['hot_leads', 'conversations', 'messages'];
      
      for (const table of tables) {
        try {
          // Check if table exists
          const tableExists = await query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = $1
            )
          `, [table]);

          if (tableExists.rows[0].exists) {
            // Update any 'default' string values in integer columns
            await query(`
              UPDATE ${table} 
              SET user_id = 'cleaned_' || id::text 
              WHERE user_id = 'default' OR user_id = 'default_user'
            `);
            results.fixes.push(`Cleaned data in ${table} table`);
          }
        } catch (tableError) {
          console.log(`Table ${table} might not exist or need cleaning:`, tableError.message);
        }
      }
      
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
      results.errors.push(`Cleanup: ${cleanupError.message}`);
    }

    // Fix 4: Ensure all required columns exist with proper defaults
    try {
      console.log('🔧 Ensuring all required columns exist...');
      
      const columnFixes = [
        {
          table: 'conversations',
          column: 'status',
          definition: "VARCHAR(50) DEFAULT 'active'"
        },
        {
          table: 'messages',
          column: 'sender_type',
          definition: "VARCHAR(50) DEFAULT 'user'"
        },
        {
          table: 'hot_leads',
          column: 'status',
          definition: "VARCHAR(50) DEFAULT 'new'"
        }
      ];

      for (const fix of columnFixes) {
        try {
          const columnExists = await query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = $1 AND column_name = $2
            )
          `, [fix.table, fix.column]);

          if (!columnExists.rows[0].exists) {
            await query(`
              ALTER TABLE ${fix.table} 
              ADD COLUMN ${fix.column} ${fix.definition}
            `);
            results.fixes.push(`Added ${fix.column} to ${fix.table}`);
          }
        } catch (columnError) {
          console.log(`Column ${fix.column} in ${fix.table} might already exist`);
        }
      }
      
    } catch (columnError) {
      console.error('Column fix error:', columnError);
      results.errors.push(`Column fixes: ${columnError.message}`);
    }

    // Final verification
    console.log('🔍 Final verification...');
    const verification = {};
    
    const criticalTables = ['customers', 'conversations', 'ai_configs', 'messages', 'hot_leads'];
    
    for (const tableName of criticalTables) {
      try {
        const result = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
        verification[tableName] = `${result.rows[0].count} records`;
      } catch (verifyError) {
        verification[tableName] = `Error: ${verifyError.message}`;
      }
    }

    console.log('✅ Database cleanup completed!');

    return NextResponse.json({
      success: true,
      message: 'Database cleanup completed successfully! ✅',
      summary: {
        fixesApplied: results.fixes.length,
        errorsEncountered: results.errors.length
      },
      details: {
        fixes: results.fixes,
        errors: results.errors
      },
      verification: verification,
      nextSteps: [
        '1. Deploy the corrected ai-config route',
        '2. Test AI configuration saving',
        '3. Check that PostgreSQL errors have stopped'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Cleanup failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}
