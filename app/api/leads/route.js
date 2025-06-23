import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

// In-memory storage for leads (replace with database later)
let leads = [];
let businesses = []; // Reference to businesses
let leadIdCounter = 1;

export async function GET(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's business
    const business = businesses.find(b => b.clerkUserId === userId);
    
    if (!business) {
      return NextResponse.json([]);
    }

    // Get leads for this business
    const businessLeads = leads.filter(l => l.businessId === business.id);
    
    // Sort by most recent first
    businessLeads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return NextResponse.json(businessLeads);
    
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    const newLead = {
      id: `lead_${leadIdCounter++}`,
      businessId: data.businessId,
      name: data.name || null,
      email: data.email || null,
      phone: data.phone || null,
      leadScore: data.leadScore || 'COLD',
      timeline: data.timeline || null,
      budget: data.budget || null,
      propertyType: data.propertyType || null,
      sessionId: data.sessionId,
      source: data.source || 'chatbot',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    leads.push(newLead);
    console.log('Lead created:', newLead);
    
    return NextResponse.json(newLead, { status: 201 });
    
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
