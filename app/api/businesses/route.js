import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

// Global in-memory storage (temporary solution)
global.businesses = global.businesses || [];
global.businessIdCounter = global.businessIdCounter || 1;

export async function POST(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    console.log('Received business data:', data);
    console.log('User ID:', userId);
    
    // Validate required fields
    if (!data.businessName || !data.subdomain) {
      return NextResponse.json({ error: 'Business name and subdomain are required' }, { status: 400 });
    }
    
    // Check if subdomain already exists
    const existingBusiness = global.businesses.find(b => b.subdomain === data.subdomain);
    if (existingBusiness) {
      return NextResponse.json({ error: 'Subdomain already taken' }, { status: 400 });
    }

    // Create new business
    const newBusiness = {
      id: `business_${global.businessIdCounter++}`,
      clerkUserId: userId,
      businessName: data.businessName,
      industry: data.industry || 'other',
      subdomain: data.subdomain,
      ownerName: data.ownerName || '',
      email: data.email || '',
      phone: data.phone || '',
      primaryColor: data.primaryColor || '#3B82F6',
      logoUrl: data.logoUrl || null,
      
      // Twilio settings (will be configured later)
      twilioPhoneNumber: null,
      twilioAccountSid: null,
      twilioAuthToken: null,
      
      // Integrations
      calendlyUrl: data.calendlyUrl || null,
      googleSheetUrl: data.googleSheetUrl || null,
      
      // Subscription
      subscriptionStatus: 'trial',
      plan: 'starter',
      
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    global.businesses.push(newBusiness);
    console.log('Business created successfully:', newBusiness.id);
    console.log('Total businesses:', global.businesses.length);

    return NextResponse.json(newBusiness, { status: 201 });
    
  } catch (error) {
    console.error('Error creating business:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all businesses for this user
    const userBusinesses = global.businesses.filter(b => b.clerkUserId === userId);
    
    console.log('Found businesses for user:', userBusinesses.length);
    
    return NextResponse.json(userBusinesses);
    
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
