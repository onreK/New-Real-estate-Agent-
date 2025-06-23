import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

// Import businesses from storage (in a real app, this would be a database)
// Note: This is temporary in-memory storage
let businesses = [];

export async function GET(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the user's business (assuming one business per user for now)
    const business = businesses.find(b => b.clerkUserId === userId);
    
    if (!business) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }
    
    return NextResponse.json(business);
    
  } catch (error) {
    console.error('Error fetching current business:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Find and update the user's business
    const businessIndex = businesses.findIndex(b => b.clerkUserId === userId);
    
    if (businessIndex === -1) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }
    
    // Update business data
    businesses[businessIndex] = {
      ...businesses[businessIndex],
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    return NextResponse.json(businesses[businessIndex]);
    
  } catch (error) {
    console.error('Error updating business:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
