// app/api/admin/migrate-database/route.js
// API endpoint to run the database migration
// This creates the multi-tenant database structure

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { runFullMigration } from '@/lib/database-migration';
import { query } from '@/lib/database';

export async function GET(request) {
  try {
    // Check authentication
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      );
    }
    
    // IMPORTANT: Only allow specific admin users to run migration
    // Replace with your actual Clerk user ID
    const ADMIN_USER_IDS = [
      userId, // Allow current user for now
      // Add your specific admin Clerk IDs here
    ];
    
    if (!ADMIN_USER_IDS.includes(userId)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    console.log('🚀 Starting database migration for user:', userId);
    
    // Run the migration
    const result = await runFullMigration();
    
    if (result.success) {
      console.log('✅ Migration completed successfully');
      
      // Get current database stats
      const stats = await getDatabaseStats();
      
      return NextResponse.json({
        success: true,
        message: 'Database migration completed successfully',
        summary: result.summary,
        stats: stats,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Migration failed:', result.error);
      
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: 'Migration failed - check server logs'
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ Migration API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// POST endpoint to check migration status without running it
export async function POST(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check current database state
    const status = await checkMigrationStatus();
    const stats = await getDatabaseStats();
    
    return NextResponse.json({
      success: true,
      status: status,
      stats: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Status check error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Check if migration has been run
 */
async function checkMigrationStatus() {
  const status = {
    ai_analytics_events_exists: false,
    contacts_table_exists: false,
    contact_events_table_exists: false,
    contacts_populated: false,
    events_linked_to_contacts: false,
    migration_complete: false
  };
  
  try {
    // Check if ai_analytics_events table exists
    const eventsTable = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_analytics_events'
      )
    `);
    status.ai_analytics_events_exists = eventsTable.rows[0].exists;
    
    // Check if contacts table exists
    const contactsTable = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'contacts'
      )
    `);
    status.contacts_table_exists = contactsTable.rows[0].exists;
    
    // Check if contact_events table exists
    const contactEventsTable = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'contact_events'
      )
    `);
    status.contact_events_table_exists = contactEventsTable.rows[0].exists;
    
    // Check if contacts are populated
    if (status.contacts_table_exists) {
      const contactCount = await query('SELECT COUNT(*) as count FROM contacts');
      status.contacts_populated = parseInt(contactCount.rows[0].count) > 0;
    }
    
    // Check if events are linked to contacts
    if (status.ai_analytics_events_exists) {
      const linkedEvents = await query(`
        SELECT 
          COUNT(*) FILTER (WHERE contact_id IS NOT NULL) as linked,
          COUNT(*) as total
        FROM ai_analytics_events
      `);
      const linked = parseInt(linkedEvents.rows[0].linked);
      const total = parseInt(linkedEvents.rows[0].total);
      status.events_linked_to_contacts = total > 0 && linked > 0;
      status.link_percentage = total > 0 ? Math.round((linked / total) * 100) : 0;
    }
    
    // Determine if migration is complete
    status.migration_complete = 
      status.ai_analytics_events_exists &&
      status.contacts_table_exists &&
      status.contact_events_table_exists;
    
  } catch (error) {
    console.error('Error checking migration status:', error);
  }
  
  return status;
}

/**
 * Get current database statistics
 */
async function getDatabaseStats() {
  const stats = {
    customers: 0,
    contacts: 0,
    events: 0,
    hot_leads: 0,
    warm_leads: 0,
    cold_leads: 0,
    events_with_contact_id: 0,
    events_without_contact_id: 0
  };
  
  try {
    // Count customers
    const customers = await query('SELECT COUNT(*) as count FROM customers');
    stats.customers = parseInt(customers.rows[0].count);
    
    // Count contacts if table exists
    try {
      const contacts = await query('SELECT COUNT(*) as count FROM contacts');
      stats.contacts = parseInt(contacts.rows[0].count);
      
      // Count by temperature
      const temperatures = await query(`
        SELECT 
          lead_temperature,
          COUNT(*) as count
        FROM contacts
        GROUP BY lead_temperature
      `);
      
      temperatures.rows.forEach(row => {
        if (row.lead_temperature === 'hot') stats.hot_leads = parseInt(row.count);
        if (row.lead_temperature === 'warm') stats.warm_leads = parseInt(row.count);
        if (row.lead_temperature === 'cold') stats.cold_leads = parseInt(row.count);
      });
    } catch (e) {
      console.log('Contacts table not yet created');
    }
    
    // Count events if table exists
    try {
      const events = await query('SELECT COUNT(*) as count FROM ai_analytics_events');
      stats.events = parseInt(events.rows[0].count);
      
      // Count events with/without contact_id
      const eventLinks = await query(`
        SELECT 
          COUNT(*) FILTER (WHERE contact_id IS NOT NULL) as with_contact,
          COUNT(*) FILTER (WHERE contact_id IS NULL) as without_contact
        FROM ai_analytics_events
      `);
      stats.events_with_contact_id = parseInt(eventLinks.rows[0].with_contact);
      stats.events_without_contact_id = parseInt(eventLinks.rows[0].without_contact);
    } catch (e) {
      console.log('ai_analytics_events table not yet created');
    }
    
  } catch (error) {
    console.error('Error getting database stats:', error);
  }
  
  return stats;
}
