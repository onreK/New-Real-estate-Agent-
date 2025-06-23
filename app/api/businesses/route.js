import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

// For now, we'll use in-memory storage (replace with database later)
let businesses = [];
let businessIdCounter = 1;

export async function POST(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Check if subdomain already exists
    const existingBusiness = businesses.find(b => b.subdomain === data.subdomain);
    if (existingBusiness) {
      return NextResponse.json({ error: 'Subdomain already taken' }, { status: 400 });
    }

    // Create new business
    const newBusiness = {
      id: `business_${businessIdCounter++}`,
      clerkUserId: userId,
      businessName: data.businessName,
      industry: data.industry,
      subdomain: data.subdomain,
      ownerName: data.ownerName,
      email: data.email,
      phone: data.phone,
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

    businesses.push(newBusiness);
    console.log('Business created:', newBusiness);

    return NextResponse.json(newBusiness, { status: 201 });
    
  } catch (error) {
    console.error('Error creating business:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all businesses for this user
    const userBusinesses = businesses.filter(b => b.clerkUserId === userId);
    
    return NextResponse.json(userBusinesses);
    
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
