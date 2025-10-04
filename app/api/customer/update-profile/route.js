// app/api/customer/update-profile/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { query } from '@/lib/database';

// Force dynamic rendering since we use authentication
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Get the current user from Clerk
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized - Please sign in' 
      }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();
    const {
      businessName,
      industry,
      website,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      timezone,
      employeeCount,
      description
    } = body;

    console.log('🏢 Updating business profile for user:', user.id);

    // First, check if customer exists
    const checkCustomerQuery = `
      SELECT id, clerk_user_id, business_name 
      FROM customers 
      WHERE clerk_user_id = $1
      LIMIT 1
    `;
    
    const customerResult = await query(checkCustomerQuery, [user.id]);
    
    if (customerResult.rows.length === 0) {
      // Create customer if doesn't exist
      const createCustomerQuery = `
        INSERT INTO customers (
          clerk_user_id, 
          email, 
          business_name, 
          plan,
          created_at,
          updated_at
        ) 
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id
      `;
      
      const createResult = await query(createCustomerQuery, [
        user.id,
        user.emailAddresses?.[0]?.emailAddress || '',
        businessName || 'My Business',
        'starter'
      ]);
      
      console.log('✅ Created new customer record');
    }

    // Update the business profile in the customers table
    const updateCustomerQuery = `
      UPDATE customers 
      SET 
        business_name = COALESCE($1, business_name),
        updated_at = NOW()
      WHERE clerk_user_id = $2
      RETURNING *
    `;
    
    const updateResult = await query(updateCustomerQuery, [
      businessName,
      user.id
    ]);

    const customer = updateResult.rows[0];

    // Check if business_profiles table exists and create/update profile
    try {
      // First check if the table exists
      const checkTableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'business_profiles'
        )
      `;
      
      const tableExists = await query(checkTableQuery);
      
      if (!tableExists.rows[0].exists) {
        // Create the business_profiles table if it doesn't exist
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS business_profiles (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
            industry VARCHAR(100),
            website VARCHAR(255),
            phone VARCHAR(50),
            address VARCHAR(255),
            city VARCHAR(100),
            state VARCHAR(50),
            zip_code VARCHAR(20),
            country VARCHAR(100),
            timezone VARCHAR(50),
            employee_count VARCHAR(20),
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(customer_id)
          )
        `;
        
        await query(createTableQuery);
        console.log('✅ Created business_profiles table');
      }

      // Insert or update the business profile
      const upsertProfileQuery = `
        INSERT INTO business_profiles (
          customer_id,
          industry,
          website,
          phone,
          address,
          city,
          state,
          zip_code,
          country,
          timezone,
          employee_count,
          description,
          updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (customer_id) 
        DO UPDATE SET
          industry = EXCLUDED.industry,
          website = EXCLUDED.website,
          phone = EXCLUDED.phone,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          zip_code = EXCLUDED.zip_code,
          country = EXCLUDED.country,
          timezone = EXCLUDED.timezone,
          employee_count = EXCLUDED.employee_count,
          description = EXCLUDED.description,
          updated_at = NOW()
        RETURNING *
      `;
      
      const profileResult = await query(upsertProfileQuery, [
        customer.id,
        industry || null,
        website || null,
        phone || null,
        address || null,
        city || null,
        state || null,
        zipCode || null,
        country || 'United States',
        timezone || 'America/New_York',
        employeeCount || null,
        description || null
      ]);

      console.log('✅ Business profile updated successfully');

      return NextResponse.json({
        success: true,
        message: 'Business profile updated successfully',
        customer: {
          ...customer,
          profile: profileResult.rows[0]
        }
      });

    } catch (profileError) {
      console.error('⚠️ Error with business_profiles table:', profileError);
      
      // Even if profile table operations fail, we still updated the customer
      return NextResponse.json({
        success: true,
        message: 'Business name updated successfully',
        customer: customer
      });
    }

  } catch (error) {
    console.error('❌ Error updating business profile:', error);
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to update business profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// GET method to retrieve current business profile
export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get customer and profile from database
    const customerQuery = `
      SELECT 
        c.*,
        bp.industry,
        bp.website,
        bp.phone,
        bp.address,
        bp.city,
        bp.state,
        bp.zip_code,
        bp.country,
        bp.timezone,
        bp.employee_count,
        bp.description
      FROM customers c
      LEFT JOIN business_profiles bp ON c.id = bp.customer_id
      WHERE c.clerk_user_id = $1
      LIMIT 1
    `;
    
    const result = await query(customerQuery, [user.id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        profile: {
          businessName: '',
          industry: '',
          website: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'United States',
          timezone: 'America/New_York',
          employeeCount: '',
          description: ''
        }
      });
    }

    const customer = result.rows[0];

    return NextResponse.json({
      success: true,
      profile: {
        businessName: customer.business_name || '',
        industry: customer.industry || '',
        website: customer.website || '',
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        zipCode: customer.zip_code || '',
        country: customer.country || 'United States',
        timezone: customer.timezone || 'America/New_York',
        employeeCount: customer.employee_count || '',
        description: customer.description || ''
      }
    });

  } catch (error) {
    console.error('❌ Error getting business profile:', error);
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to get business profile'
    }, { status: 500 });
  }
}
