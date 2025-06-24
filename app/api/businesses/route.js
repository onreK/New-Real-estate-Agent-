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
    
    // Handle both 'slug' and 'subdomain' field names
    const businessSlug = data.slug || data.subdomain;
    
    // Validate required fields
    if (!data.businessName || !businessSlug) {
      console.error('Missing required fields:', { businessName: data.businessName, slug: businessSlug });
      return NextResponse.json({ 
        error: 'Business name and slug/subdomain are required',
        received: { businessName: !!data.businessName, slug: !!businessSlug }
      }, { status: 400 });
    }
    
    // Check if subdomain already exists
    const existingBusiness = global.businesses.find(b => 
      b.subdomain === businessSlug || b.slug === businessSlug
    );
    if (existingBusiness) {
      return NextResponse.json({ error: 'Subdomain already taken' }, { status: 400 });
    }

    // Create new business
    const newBusiness = {
      id: `business_${global.businessIdCounter++}`,
      clerkUserId: userId,
      businessName: data.businessName,
      industry: data.industry || 'other',
      subdomain: businessSlug, // Use the slug as subdomain
      slug: businessSlug, // Also store as slug for consistency
      ownerName: data.ownerName || '',
      email: data.email || '',
      phone: data.phone || '',
      primaryColor: data.primaryColor || '#3B82F6',
      logoUrl: data.logoUrl || null,
      
      // NEW: Site type configuration
      siteType: data.siteType || 'fullsite', // 'widget' or 'fullsite'
      
      // Website content (for full site customers)
      businessDescription: data.businessDescription || '',
      services: Array.isArray(data.services) ? data.services : 
                (typeof data.services === 'string' ? data.services.split('\n').filter(s => s.trim()) : []),
      heroText: data.heroText || `Welcome to ${data.businessName}`,
      aboutText: data.aboutText || '',
      
      // Twilio settings (will be configured later)
      twilioPhoneNumber: null,
      twilioAccountSid: null,
      twilioAuthToken: null,
      
      // Integrations
      calendlyUrl: data.calendlyUrl || null,
      googleSheetUrl: data.googleSheetUrl || null,
      
      // Subscription
      subscriptionStatus: 'trial',
      plan: data.siteType === 'widget' ? 'widget-starter' : 'fullsite-starter',
      
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    global.businesses.push(newBusiness);
    console.log('Business created successfully:', newBusiness.id);
    console.log('Business slug/subdomain:', businessSlug);
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
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const { userId } = auth();
    
    // If requesting specific business by slug (for customer sites)
    if (slug) {
      const business = global.businesses.find(b => 
        b.subdomain === slug || b.slug === slug
      );
      
      if (!business) {
        console.log('Business not found for slug:', slug);
        console.log('Available businesses:', global.businesses.map(b => ({ id: b.id, slug: b.subdomain || b.slug })));
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }
      
      console.log('Found business for slug:', slug, business.id);
      return NextResponse.json({ business });
    }
    
    // Get user's businesses (for dashboard)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userBusinesses = global.businesses.filter(b => b.clerkUserId === userId);
    console.log('Found businesses for user:', userBusinesses.length);
    
    return NextResponse.json(userBusinesses);
    
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
