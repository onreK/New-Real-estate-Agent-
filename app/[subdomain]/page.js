import { notFound } from 'next/navigation';

// Server component to fetch business data
async function getBusinessData(subdomain) {
  try {
    console.log('Fetching business data for subdomain:', subdomain);
    
    // For server-side calls, we need to construct the full URL differently
    // Try multiple URL construction methods to ensure it works
    let baseUrl;
    
    if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else if (process.env.NODE_ENV === 'production') {
      // Try to get the URL from headers or construct it
      baseUrl = 'https://new-real-estate-agent-bph2zbddg-kernos-projects.vercel.app';
    } else {
      baseUrl = 'http://localhost:3000';
    }
    
    const apiUrl = `${baseUrl}/api/businesses?slug=${subdomain}`;
    console.log('Server-side API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    console.log('Server-side API Response status:', response.status);
    console.log('Server-side API Response ok:', response.ok);
    
    if (!response.ok) {
      console.log('Server-side API response not ok:', response.status, response.statusText);
      
      // If server-side fetch fails, return null and let client handle it
      // This is a fallback approach
      return null;
    }
    
    const data = await response.json();
    console.log('Server-side API Response data:', data);
    
    return data.business || null;
  } catch (error) {
    console.error('Server-side API Error:', error);
    
    // Fallback: If server-side fails, we'll handle it client-side
    // For now, return null to show "Site Not Found"
    return null;
  }
}

export default async function CustomerSitePage({ params }) {
  const { subdomain } = params;
  
  console.log('Customer site page rendered for subdomain:', subdomain);
  
  const business = await getBusinessData(subdomain);
  
  if (!business) {
    console.log('Business not found for subdomain:', subdomain);
    
    // Add debug info to help troubleshoot
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Site Not Found</h1>
          <p className="text-lg text-gray-600 mb-6">
            The subdomain "{subdomain}" doesn't exist or hasn't been set up yet.
          </p>
          
          {/* Debug info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-bold text-yellow-800 mb-2">Debug Info:</h3>
            <div className="text-sm text-yellow-700 space-y-1">
              <p><strong>Requested subdomain:</strong> {subdomain}</p>
              <p><strong>API endpoint tried:</strong> /api/businesses?slug={subdomain}</p>
              <p><strong>Troubleshooting steps:</strong></p>
              <ol className="list-decimal list-inside ml-4 space-y-1">
                <li>Check if business exists: <a href={`/api/businesses?slug=${subdomain}`} className="text-blue-600 underline" target="_blank">Test API directly</a></li>
                <li>Check dashboard for correct subdomain</li>
                <li>Verify business was created successfully</li>
              </ol>
            </div>
          </div>
          
          <div className="space-y-3">
            <a 
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mr-3"
            >
              Go to Main Site
            </a>
            <a 
              href="/dashboard"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  console.log('Business found:', business.businessName);
  
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              {business.logoUrl ? (
                <img 
                  src={business.logoUrl} 
                  alt={business.businessName}
                  className="h-10 w-auto"
                />
              ) : (
                <div 
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: business.primaryColor }}
                >
                  {business.businessName.charAt(0)}
                </div>
              )}
              <h1 className="ml-3 text-2xl font-bold text-gray-900">
                {business.businessName}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href={`tel:${business.phone}`}
                className="text-gray-600 hover:text-gray-900"
              >
                📞 {business.phone}
              </a>
              <button
                className="text-white px-6 py-2 rounded-lg font-medium"
                style={{ backgroundColor: business.primaryColor }}
              >
                📅 Book Free Consultation
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {business.heroText || `Welcome to ${business.businessName}`}
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            {business.businessDescription}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              className="text-white px-8 py-3 rounded-lg font-medium text-lg"
              style={{ backgroundColor: business.primaryColor }}
            >
              Get Started Today
            </button>
            <button className="border-2 border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-medium text-lg hover:bg-gray-50">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      {business.services && business.services.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Services</h2>
              <p className="text-lg text-gray-600">Professional services you can trust</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {business.services.map((service, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-6 text-center">
                  <div className="text-4xl mb-4">🏠</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{service}</h3>
                  <p className="text-gray-600">Expert {service.toLowerCase()} services tailored to your needs.</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* AI Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-center space-x-2 mb-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
              style={{ backgroundColor: business.primaryColor }}
            >
              🤖
            </div>
            <div>
              <div className="font-semibold text-sm">{business.businessName} AI Assistant</div>
              <div className="text-xs text-green-500">● Enhanced Lead Scoring</div>
            </div>
          </div>
          <div className="bg-gray-100 p-3 rounded-lg text-sm mb-3">
            Hi! I'm {business.ownerName}'s AI assistant with enhanced lead tracking and real-time SMS alerts. How can I help you today?
          </div>
          <button 
            className="w-full text-white px-4 py-2 rounded text-sm font-medium"
            style={{ backgroundColor: business.primaryColor }}
          >
            Start Conversation
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-xl font-bold mb-2">{business.businessName}</h3>
          <p className="text-gray-400">{business.businessDescription}</p>
          <div className="mt-4 space-x-6">
            <span>📞 {business.phone}</span>
            <span>📧 {business.email}</span>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-800 text-gray-400 text-sm">
            © 2025 {business.businessName}. All rights reserved. | Powered by AI Business Automation
          </div>
        </div>
      </footer>
    </div>
  );
}
