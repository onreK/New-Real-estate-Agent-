import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

// Temporary in-memory storage for leads
global.leads = global.leads || [];

export async function GET(request) {
  try {
    console.log('Leads API called');
    
    // For now, return sample leads for testing
    const sampleLeads = [
      {
        id: 'lead_1',
        businessId: 'business_1',
        customerName: 'John Smith',
        email: 'john@example.com',
        phone: '(555) 123-4567',
        score: 'HOT',
        lastMessage: 'Interested in buying a house in Richmond',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        status: 'new'
      },
      {
        id: 'lead_2',
        businessId: 'business_1',
        customerName: 'Sarah Johnson',
        email: 'sarah@example.com',
        phone: '(555) 987-6543',
        score: 'WARM',
        lastMessage: 'Looking for a real estate agent',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        status: 'contacted'
      },
      {
        id: 'lead_3',
        businessId: 'business_1',
        customerName: 'Mike Davis',
        email: 'mike@example.com',
        phone: '(555) 456-7890',
        score: 'COLD',
        lastMessage: 'Just browsing properties',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        status: 'follow-up'
      }
    ];
    
    console.log('Returning sample leads:', sampleLeads.length);
    return NextResponse.json(sampleLeads);
    
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('Creating new lead:', body);
    
    const newLead = {
      id: `lead_${Date.now()}`,
      ...body,
      timestamp: new Date().toISOString(),
      status: 'new'
    };
    
    global.leads.push(newLead);
    console.log('Lead created:', newLead.id);
    
    return NextResponse.json(newLead, { status: 201 });
    
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
