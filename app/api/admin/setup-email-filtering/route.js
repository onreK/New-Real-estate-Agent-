// app/api/admin/setup-email-filtering/route.js
// Simple database setup to add email filtering columns
import { getDbClient } from '@/lib/database';
import { NextResponse } from 'next/server';

export async function POST() {
  const client = await getDbClient().connect();
  
  try {
    console.log('🔧 Adding email filtering columns to database...');

    // Add columns for email filtering and business rules
    const columns = [
      // Email filtering columns
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS auto_archive_spam BOOLEAN DEFAULT true',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS block_mass_emails BOOLEAN DEFAULT true',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS personal_only BOOLEAN DEFAULT false',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS skip_auto_generated BOOLEAN DEFAULT true',
      
      // Business rules columns (JSONB for flexibility)
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS blacklist_emails JSONB DEFAULT \'[]\'',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS whitelist_emails JSONB DEFAULT \'[]\'',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS priority_keywords JSONB DEFAULT \'[]\'',
      
      // Response control columns
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS business_hours_only BOOLEAN DEFAULT true',
      'ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS urgent_priority BOOLEAN DEFAULT true'
    ];

    let successCount = 0;
    let alreadyExistCount = 0;
    
    for (const query of columns) {
      try {
        await client.query(query);
        successCount++;
        console.log('✅ Column added/verified');
      } catch (error) {
        if (error.message.includes('already exists')) {
          alreadyExistCount++;
          console.log('⚠️ Column already exists (this is fine)');
        } else {
          console.error('Error adding column:', error.message);
        }
      }
    }

    console.log('🎉 Email filtering database setup completed!');

    return NextResponse.json({
      success: true,
      message: 'Email filtering database structure created successfully',
      details: {
        columnsProcessed: columns.length,
        newColumnsAdded: successCount - alreadyExistCount,
        columnsAlreadyExisted: alreadyExistCount
      },
      features: [
        'Email filtering settings',
        'Business rules (blacklist/whitelist)',
        'Priority keywords',
        'Response control settings'
      ]
    });

  } catch (error) {
    console.error('❌ Database setup error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to setup database',
      details: error.message
    }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Email Filtering Database Setup',
    description: 'Use POST to create/update email filtering database structure',
    endpoint: '/api/admin/setup-email-filtering',
    instructions: 'Make a POST request to this endpoint to add the necessary database columns'
  });
}
