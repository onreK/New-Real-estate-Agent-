// app/api/businesses/route.js
import { NextResponse } from 'next/server';

// In-memory storage (replace with database in production)
let businesses = [
  {
    id: 'business_test_1',
    clerkUserId: 'test-user-123',
    businessName: 'Test Real Estate Co',
    industry: 'real-estate',
    businessType: 'ai-only',
    slug: 'test-realestate',
    aiFeatures: ['chatbot', 'voice', 'lead-scoring'],
    businessDescription: 'Professional real estate services you can trust in the test area.',
    targetAudience: 'Home buyers and sellers',
    isPrimary: true,
    onboardingCompleted: true,
    
    // AI Configuration fields
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    aiPersonality: 'professional',
    aiTone: 'helpful',
    customInstructions: '',
    knowledgeBase: '',
    model: 'gpt-4',
    maxTokens: 200,
    temperature: 0.7,
    
    createdAt: '2025-06-24T08:03:46.624Z',
    updatedAt: '2025-06-24T08:03:46.624Z',
    // Legacy fields for compatibility
    name: 'Test Real Estate Co',
    subdomain: 'test-realestate',
    description: 'Professional real estate services you can trust in the test area.'
  }
];

// Generate unique ID
function generateId() {
  return 'business_' + Math.random().toString(36).substr(2, 9);
}

// Generate slug from business name
function generateSlug(businessName) {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    if (slug) {
      // Find business by slug
      const business = businesses.find(b => 
        b.slug === slug || b.subdomain === slug
      );
      
      if (business) {
        return NextResponse.json([business]);
      } else {
        return NextResponse.json([]);
      }
    }
    
    // Return all businesses
    return NextResponse.json(businesses);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch businesses' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    console.log('Received business data:', data);
    
    // Validate required fields
    const requiredFields = ['businessName', 'industry', 'businessType'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          missingFields,
          received: Object.keys(data)
        },
        { status: 400 }
      );
    }
    
    // Generate unique ID and slug
    const businessId = generateId();
    const slug = generateSlug(data.businessName);
    
    // Check if slug already exists
    const existingBusiness = businesses.find(b => b.slug === slug);
    if (existingBusiness) {
      return NextResponse.json(
        { error: 'Business name already exists' },
        { status: 409 }
      );
    }
    
    // Create new business object
    const newBusiness = {
      id: businessId,
      clerkUserId: data.clerkUserId || 'anonymous-user',
      businessName: data.businessName,
      industry: data.industry,
      businessType: data.businessType || 'ai-only',
      slug: slug,
      aiFeatures: data.aiFeatures || [],
      businessDescription: data.businessDescription || '',
      targetAudience: data.targetAudience || '',
      isPrimary: businesses.length === 0, // First business is primary
      onboardingCompleted: data.onboardingCompleted || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // Legacy fields for compatibility
      name: data.businessName,
      subdomain: slug,
      description: data.businessDescription || ''
    };
    
    // Add to businesses array
    businesses.push(newBusiness);
    
    console.log('Created new business:', newBusiness);
    console.log('Total businesses:', businesses.length);
    
    return NextResponse.json(newBusiness, { status: 201 });
    
  } catch (error) {
    console.error('Error creating business:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create business',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id } = data;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Business ID is required for updates' },
        { status: 400 }
      );
    }
    
    // Find business to update
    const businessIndex = businesses.findIndex(b => b.id === id);
    
    if (businessIndex === -1) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }
    
    // Update business
    const updatedBusiness = {
      ...businesses[businessIndex],
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    businesses[businessIndex] = updatedBusiness;
    
    console.log('Updated business:', updatedBusiness);
    
    return NextResponse.json(updatedBusiness);
    
  } catch (error) {
    console.error('Error updating business:', error);
    return NextResponse.json(
      { error: 'Failed to update business' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }
    
    // Find and remove business
    const businessIndex = businesses.findIndex(b => b.id === id);
    
    if (businessIndex === -1) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }
    
    const deletedBusiness = businesses.splice(businessIndex, 1)[0];
    
    console.log('Deleted business:', deletedBusiness);
    
    return NextResponse.json({ success: true, deleted: deletedBusiness });
    
  } catch (error) {
    console.error('Error deleting business:', error);
    return NextResponse.json(
      { error: 'Failed to delete business' },
      { status: 500 }
    );
  }
}
