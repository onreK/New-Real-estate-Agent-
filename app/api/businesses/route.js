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
    let businessSlug = data.slug || data.subdomain;
    console.log('Original business slug:', businessSlug);
    
    // Check if subdomain already exists and make it unique
    let finalSlug = businessSlug;
    let counter = 1;
    while (global.businesses.find(b => b.subdomain === finalSlug || b.slug === finalSlug)) {
      finalSlug = `${businessSlug}-${counter}`;
      counter++;
      console.log('Slug already exists, trying:', finalSlug);
    }
    
    console.log('Final unique slug:', finalSlug);
    
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

    // Create new business
    const newBusiness = {
      id: `business_${global.businessIdCounter++}`,
      clerkUserId: userId,
      businessName: data.businessName,
      industry: data.industry || 'other',
      subdomain: finalSlug, // Use the unique slug
      slug: finalSlug, // Also store as slug for consistency
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
    const { pathname } = new URL(request.url);
    
    console.log('GET request - pathname:', pathname, 'slug:', slug);
    console.log('Available businesses:', global.businesses.map(b => ({ id: b.id, slug: b.slug })));
    
    // Handle /api/businesses/current route (for dashboard)
    if (pathname.includes('/current')) {
      let userId;
      try {
        const authResult = auth();
        userId = authResult?.userId;
      } catch (authError) {
        console.log('Auth error in GET, returning all businesses');
        // For testing, return the first business if no auth
        if (global.businesses.length > 0) {
          return NextResponse.json([global.businesses[0]]);
        }
        return NextResponse.json([]);
      }
      
      if (userId) {
        const userBusinesses = global.businesses.filter(b => b.clerkUserId === userId);
        console.log('Found businesses for user:', userBusinesses.length);
        return NextResponse.json(userBusinesses);
      } else {
        // For testing, return all businesses
        return NextResponse.json(global.businesses);
      }
    }
    
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
    
    // Return all businesses for general requests
    console.log('Returning all businesses:', global.businesses.length);
    return NextResponse.json(global.businesses);
    
  } catch (error) {
    console.error('Error in GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
