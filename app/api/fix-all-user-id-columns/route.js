import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔧 Starting comprehensive user_id column migration...');
    
    // Dynamic import
    const { query } = await import('../../../lib/database.js');
    
    // List of tables that need user_id columns (based on your PostgreSQL errors)
    const tablesToFix = [
      'customers',
      'conversations', 
      'sms_conversations',
      'email_settings',
      'email_conversations',
      'email_templates',
      'hot_leads',
      'messages',
      'sms_messages',
      'email_messages'
    ];

    const results = {
      tablesProcessed: [],
      columnsAdded: [],
      alreadyExists: [],
      errors: []
    };

    for (const tableName of tablesToFix) {
      try {
        console.log(`🔍 Checking table: ${tableName}`);
        
        // Check if table exists
        const tableExists = await query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [tableName]);

        if (!tableExists.rows[0].exists) {
          console.log(`⚠️ Table ${tableName} doesn't exist, skipping...`);
          continue;
        }

        // Check if user_id column already exists
        const columnExists = await query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = $1 AND column_name = 'user_id'
          )
        `, [tableName]);

        if (columnExists.rows[0].exists) {
          console.log(`✅ Table ${tableName} already has user_id column`);
          results.alreadyExists.push(tableName);
        } else {
          console.log(`➕ Adding user_id column to ${tableName}...`);
          
          // Add user_id column with default value
          await query(`
            ALTER TABLE ${tableName} 
            ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT 'default_user'
          `);

          // For customers table, also add unique constraint on user_id if it doesn't exist
          if (tableName === 'customers') {
            try {
              await query(`
                ALTER TABLE customers 
                ADD CONSTRAINT customers_user_id_unique UNIQUE (user_id)
              `);
              console.log('✅ Added unique constraint to customers.user_id');
            } catch (constraintError) {
              console.log('⚠️ Unique constraint might already exist on customers.user_id');
            }
          }

          console.log(`✅ Added user_id column to ${tableName}`);
          results.columnsAdded.push(tableName);
        }

        results.tablesProcessed.push(tableName);

      } catch (tableError) {
        console.error(`❌ Error processing table ${tableName}:`, tableError);
        results.errors.push({
          table: tableName,
          error: tableError.message
        });
      }
    }

    // Now verify all columns exist
    console.log('🔍 Final verification...');
    const verification = {};
    
    for (const tableName of tablesToFix) {
      try {
        const columnCheck = await query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = $1 AND column_name = 'user_id'
          )
        `, [tableName]);
        
        verification[tableName] = columnCheck.rows[0].exists;
      } catch (verifyError) {
        verification[tableName] = `Error: ${verifyError.message}`;
      }
    }

    console.log('✅ Migration completed!');

    return NextResponse.json({
      success: true,
      message: 'user_id columns migration completed successfully! ✅',
      summary: {
        tablesProcessed: results.tablesProcessed.length,
        columnsAdded: results.columnsAdded.length,
        alreadyExisted: results.alreadyExists.length,
        errors: results.errors.length
      },
      details: {
        tablesProcessed: results.tablesProcessed,
        columnsAdded: results.columnsAdded,
        alreadyExists: results.alreadyExists,
        errors: results.errors
      },
      verification: verification,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}
