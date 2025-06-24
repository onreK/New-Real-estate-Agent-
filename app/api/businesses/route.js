import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

// Global in-memory storage (temporary solution)
global.businesses = global.businesses || [];
global.businessIdCounter = global.businessIdCounter || 1;

export async function POST(request) {
  console.log('=== API CALL STARTED ===');
  
  try {
    // Try to get auth, but don't fail if it doesn't work
    let userId;
    try {
      const authResult = auth();
      userId = authResult?.userId;
      console.log('Auth result:', { userId, hasAuth: !!authResult });
    } catch (authError) {
      console.error('Auth error:', authError);
      // For now, let's continue without auth to test
      userId = 'temp-user-' + Date.now();
      console.log('Using temporary userId:', userId);
    }
    
    if (!userId) {
      console.log('No userId found, creating temporary one');
      userId = 'temp-user-' + Date.now();
    }

    const data = await request.json();
    console.log('Received business data:', JSON.stringify(data, null, 2));
    
    // Handle both 'slug' and 'subdomain' field names
    const businessSlug = data.slug || data.subdomain;
    console.log('Business slug extracted:', businessSlug);
    
    // Validate required fields
    if (!data.businessName) {
      console.error('Missing businessName');
      return NextResponse.json({ 
        error: 'Business name is required',
        received: data
      }, { status: 400 });
    }
    
    if (!businessSlug) {
      console.error('Missing slug/subdomain');
      return NextResponse.json({ 
        error: 'Business slug/subdomain is required',
        received: data
      }, { status: 400 });
    }
    
    // Check if subdomain already exists
    const existingBusiness = global.businesses.find(b => 
      b.subdomain === businessSlug || b.slug === businessSlug
    );
    if (existingBusiness) {
      console.log('Business already exists:', businessSlug);
      return NextResponse.json({ error: 'Subdomain already taken' }, { status: 400 });
    }

    // Create new business
    const newBusiness = {
      id: `business_${global.businessIdCounter++}`,
      clerkUserId: userId,
      businessName: data.businessName,
      industry: data.industry || 'other',
      subdomain: businessSlug,
      slug: businessSlug,
      ownerName: data.ownerName || '',
      email: data.email || '',
      phone: data.phone || '',
      primaryColor: data.primaryColor || '#3B82F6',
      logoUrl: data.logoUrl || null,
      
      siteType: data.siteType || 'fullsite',
      
      businessDescription: data.businessDescription || '',
      services: Array.isArray(data.services) ? data.services : 
                (typeof data.services === 'string' ? data.services.split('\n').filter(s => s.trim()) : []),
      heroText: data.heroText || `Welcome to ${data.businessName}`,
      aboutText: data.aboutText || '',
      
      twilioPhoneNumber: null,
      twilioAccountSid: null,
      twilioAuthToken: null,
      
      calendlyUrl: data.calendlyUrl || null,
      googleSheetUrl: data.googleSheetUrl || null,
      
      subscriptionStatus: 'trial',
      plan: data.siteType === 'widget' ? 'widget-starter' : 'fullsite-starter',
      
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('Creating business:', JSON.stringify(newBusiness, null, 2));
    
    global.businesses.push(newBusiness);
    console.log('Business created successfully. Total businesses:', global.businesses.length);
    console.log('All businesses:', global.businesses.map(b => ({ id: b.id, slug: b.slug })));

    return NextResponse.json(newBusiness, { status: 201 });
    
  } catch (error) {
    console.error('=== DETAILED ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error);
    
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    console.log('GET request for slug:', slug);
    console.log('Available businesses:', global.businesses.map(b => ({ id: b.id, slug: b.slug })));
    
    // If requesting specific business by slug (for customer sites)
    if (slug) {
      const business = global.businesses.find(b => 
        b.subdomain === slug || b.slug === slug
      );
      
      if (!business) {
        console.log('Business not found for slug:', slug);
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }
      
      console.log('Found business for slug:', slug);
      return NextResponse.json({ business });
    }
    
    // Return all businesses for now (since auth might be broken)
    console.log('Returning all businesses:', global.businesses.length);
    return NextResponse.json(global.businesses);
    
  } catch (error) {
    console.error('Error in GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
