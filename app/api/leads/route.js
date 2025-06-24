// app/api/leads/route.js
import { NextResponse } from 'next/server';

// In-memory storage for leads (replace with database in production)
let leads = [
  {
    id: 'lead_1',
    name: 'John Smith',
    email: 'john@example.com',
    businessId: 'business_test_1',
    source: 'AI Chatbot',
    score: 'HOT',
    createdAt: '2025-06-24T12:00:00.000Z',
    conversationHistory: []
  },
  {
    id: 'lead_2',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    businessId: 'business_test_1',
    source: 'Voice Agent',
    score: 'WARM',
    createdAt: '2025-06-23T15:30:00.000Z',
    conversationHistory: []
  },
  {
    id: 'lead_3',
    name: 'Mike Davis',
    email: 'mike@example.com',
    businessId: 'business_test_1',
    source: 'AI Chatbot',
    score: 'COLD',
    createdAt: '2025-06-21T09:15:00.000Z',
    conversationHistory: []
  }
];

// Generate unique ID
function generateLeadId() {
  return 'lead_' + Math.random().toString(36).substr(2, 9);
}

// Calculate lead score based on conversation
function calculateLeadScore(conversationHistory, source) {
  let score = 0;
  
  // Base score by source
  if (source === 'AI Chatbot') score += 10;
  if (source === 'Voice Agent') score += 15;
  
  // Analyze conversation for buying signals
  const conversationText = conversationHistory
    .map(msg => msg.text)
    .join(' ')
    .toLowerCase();
  
  // High-intent keywords
  const hotKeywords = ['ready to buy', 'schedule', 'appointment', 'interested', 'price', 'quote'];
  const warmKeywords = ['looking for', 'need help', 'considering', 'thinking about'];
  const coldKeywords = ['just browsing', 'maybe later', 'not sure'];
  
  hotKeywords.forEach(keyword => {
    if (conversationText.includes(keyword)) score += 20;
  });
  
  warmKeywords.forEach(keyword => {
    if (conversationText.includes(keyword)) score += 10;
  });
  
  coldKeywords.forEach(keyword => {
    if (conversationText.includes(keyword)) score -= 10;
  });
  
  // Conversation length indicates engagement
  if (conversationHistory.length > 10) score += 15;
  else if (conversationHistory.length > 5) score += 10;
  else if (conversationHistory.length > 2) score += 5;
  
  // Convert to categories
  if (score >= 40) return 'HOT';
  if (score >= 20) return 'WARM';
  return 'COLD';
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    let filteredLeads = leads;
    
    if (businessId) {
      filteredLeads = leads.filter(lead => lead.businessId === businessId);
    }
    
    // Sort by creation date (newest first)
    filteredLeads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return NextResponse.json(filteredLeads);
    
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    console.log('Received lead data:', data);
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'businessId', 'source'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          missingFields,
          received: Object.keys(data)
        },
        { status: 400 }
      );
    }
    
    // Check if lead already exists (same email for same business)
    const existingLead = leads.find(lead => 
      lead.email === data.email && lead.businessId === data.businessId
    );
    
    if (existingLead) {
      // Update existing lead with new conversation
      existingLead.conversationHistory = data.conversationHistory || [];
      existingLead.score = data.score || calculateLeadScore(
        existingLead.conversationHistory, 
        existingLead.source
      );
      existingLead.updatedAt = new Date().toISOString();
      
      console.log('Updated existing lead:', existingLead);
      return NextResponse.json(existingLead);
    }
    
    // Calculate lead score
    const calculatedScore = data.score || calculateLeadScore(
      data.conversationHistory || [], 
      data.source
    );
    
    // Create new lead
    const newLead = {
      id: generateLeadId(),
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone || null,
      businessId: data.businessId,
      source: data.source,
      score: calculatedScore,
      conversationHistory: data.conversationHistory || [],
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to leads array
    leads.push(newLead);
    
    console.log('Created new lead:', newLead);
    console.log('Total leads:', leads.length);
    
    // Return the created lead
    return NextResponse.json(newLead, { status: 201 });
    
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create lead',
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
        { error: 'Lead ID is required for updates' },
        { status: 400 }
      );
    }
    
    // Find lead to update
    const leadIndex = leads.findIndex(lead => lead.id === id);
    
    if (leadIndex === -1) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }
    
    // Update lead
    const updatedLead = {
      ...leads[leadIndex],
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    // Recalculate score if conversation history changed
    if (data.conversationHistory) {
      updatedLead.score = calculateLeadScore(
        data.conversationHistory,
        updatedLead.source
      );
    }
    
    leads[leadIndex] = updatedLead;
    
    console.log('Updated lead:', updatedLead);
    
    return NextResponse.json(updatedLead);
    
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: 'Failed to update lead' },
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
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }
    
    // Find and remove lead
    const leadIndex = leads.findIndex(lead => lead.id === id);
    
    if (leadIndex === -1) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }
    
    const deletedLead = leads.splice(leadIndex, 1)[0];
    
    console.log('Deleted lead:', deletedLead);
    
    return NextResponse.json({ success: true, deleted: deletedLead });
    
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    );
  }
}
