import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { subdomain } = params;
  
  try {
    console.log('Widget auth check for subdomain:', subdomain);
    
    // Check if business exists and subscription is active
    const businesses = global.businesses || [];
    const business = businesses.find(b => b.subdomain === subdomain);
    
    if (!business) {
      return NextResponse.json({ 
        error: 'Widget not found',
        active: false 
      }, { status: 404 });
    }
    
    // CHECK SUBSCRIPTION STATUS
    const subscriptionActive = checkSubscriptionStatus(business);
    
    if (!subscriptionActive) {
      return NextResponse.json({ 
        error: 'Subscription inactive',
        active: false,
        message: 'This AI assistant is temporarily unavailable. Please contact the business owner.'
      }, { status: 402 }); // Payment Required
    }
    
    // Return widget configuration if subscription is active
    return NextResponse.json({
      active: true,
      config: {
        businessId: business.id,
        businessName: business.businessName,
        primaryColor: business.primaryColor,
        ownerName: business.ownerName,
        industry: business.industry,
        welcomeMessage: `Hi! I'm ${business.ownerName}'s AI assistant. How can I help you today?`,
        siteType: business.siteType
      }
    });
    
  } catch (error) {
    console.error('Widget authentication error:', error);
    return NextResponse.json({ 
      error: 'Authentication failed',
      active: false 
    }, { status: 500 });
  }
}

function checkSubscriptionStatus(business) {
  // In real implementation, this would check:
  // 1. Stripe subscription status
  // 2. Last payment date
  // 3. Trial period expiration
  // 4. Account suspension status
  
  const now = new Date();
  const created = new Date(business.createdAt);
  const daysSinceCreated = (now - created) / (1000 * 60 * 60 * 24);
  
  console.log(`Business ${business.subdomain}: ${daysSinceCreated} days since created, status: ${business.subscriptionStatus}`);
  
  // Example: 14-day trial, then requires active subscription
  if (business.subscriptionStatus === 'trial' && daysSinceCreated > 14) {
    console.log('Trial expired');
    return false; // Trial expired
  }
  
  if (business.subscriptionStatus === 'cancelled' || business.subscriptionStatus === 'suspended') {
    console.log('Subscription inactive');
    return false; // Subscription inactive
  }
  
  return true; // Active subscription
}
