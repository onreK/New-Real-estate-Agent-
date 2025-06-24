import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { subdomain } = params;
    
    console.log('Looking for subdomain:', subdomain);
    
    // Access global businesses array
    const businesses = global.businesses || [];
    
    // Find business by subdomain
    const business = businesses.find(b => b.subdomain === subdomain);
    
    if (!business) {
      return NextResponse.json({ 
        error: 'Business not found',
        subdomain 
      }, { status: 404 });
    }
    
    // Return business data for the site
    return NextResponse.json({
      business,
      siteType: business.siteType,
      branding: {
        primaryColor: business.primaryColor,
        businessName: business.businessName,
        logoUrl: business.logoUrl
      },
      content: {
        heroText: business.heroText,
        businessDescription: business.businessDescription,
        services: business.services ? business.services.split('\n').filter(s => s.trim()) : [],
        aboutText: business.aboutText
      },
      contact: {
        ownerName: business.ownerName,
        phone: business.phone,
        email: business.email
      },
      integrations: {
        calendlyUrl: business.calendlyUrl,
        googleSheetUrl: business.googleSheetUrl
      }
    });
    
  } catch (error) {
    console.error('Error fetching site data:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
