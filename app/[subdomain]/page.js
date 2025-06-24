// app/[subdomain]/page.js

// Define getBaseUrl outside the component so it's accessible everywhere
const getBaseUrl = () => {
  // Check for custom NEXTAUTH_URL first
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  
  // Handle Vercel deployments - VERCEL_URL should be set automatically
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Handle production with current deployment - LATEST URL
  if (process.env.NODE_ENV === 'production') {
    return 'https://new-real-estate-agent-p8w1fdpr5-kemos-projects.vercel.app';
  }
  
  // Development fallback
  return 'http://localhost:3000';
};

export default async function CustomerSite({ params }) {
  const subdomain = params.subdomain;
  
  try {
    const baseUrl = getBaseUrl();
    const apiUrl = `${baseUrl}/api/businesses?slug=${subdomain}`;
    console.log('Server-side fetch attempting:', apiUrl);
    
    // Try different approaches to handle 401 issue
    const response = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; NextJS-SSR)',
        // Try adding origin header
        'Origin': baseUrl,
        'Referer': baseUrl,
      },
    });

    console.log('Server-side fetch response:', response.status, response.statusText);

    if (!response.ok) {
      console.error(`API call failed: ${response.status} ${response.statusText}`);
      
      // If 401, try to provide more helpful error info
      if (response.status === 401) {
        console.error('Authentication issue - API might require different headers for server-side calls');
      }
      
      throw new Error(`Failed to fetch business: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received data:', data);
    
    if (!data || data.length === 0) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Site Not Found</h1>
            <p className="text-gray-600 mb-4">
              No business found for subdomain: <code className="bg-gray-100 px-2 py-1 rounded">{subdomain}</code>
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h3 className="font-semibold text-blue-900 mb-2">Debug Info:</h3>
              <p className="text-blue-700 text-sm">
                API URL: {apiUrl}
              </p>
              <p className="text-blue-700 text-sm">
                Response Status: {response.status}
              </p>
            </div>
          </div>
        </div>
      );
    }

    const business = data[0]; // Assuming API returns array

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <h1 className="text-3xl font-bold text-gray-900">
                  {business.name || business.businessName}
                </h1>
              </div>
              <nav className="hidden md:flex space-x-8">
                <a href="#services" className="text-gray-600 hover:text-gray-900">Services</a>
                <a href="#about" className="text-gray-600 hover:text-gray-900">About</a>
                <a href="#contact" className="text-gray-600 hover:text-gray-900">Contact</a>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Welcome to {business.name || business.businessName}
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                {business.description || business.businessDescription || "Your trusted partner for all your business needs."}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                  Get Started
                </button>
                <button className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Our Services</h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                We provide comprehensive solutions tailored to your needs.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((item) => (
                <div key={item} className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">Service {item}</h4>
                  <p className="text-gray-600">
                    Professional service description that highlights the value we provide to our clients.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Get In Touch</h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Ready to work with {business.name || business.businessName}? Contact us today.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div>
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="w-6 h-6 text-blue-600 mt-1">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-semibold text-gray-900">Address</h4>
                      <p className="text-gray-600">
                        {business.address || "123 Business St, City, State 12345"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 text-blue-600 mt-1">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-semibold text-gray-900">Phone</h4>
                      <p className="text-gray-600">
                        {business.phone || "(555) 123-4567"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 text-blue-600 mt-1">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-semibold text-gray-900">Email</h4>
                      <p className="text-gray-600">
                        {business.email || "info@business.com"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-gray-400">
                © 2024 {business.name || business.businessName}. All rights reserved.
              </p>
            </div>
          </div>
        </footer>

        {/* Debug Panel (remove in production) */}
        <div className="fixed bottom-4 right-4 bg-black text-white p-3 rounded-lg text-xs max-w-sm">
          <strong>Debug:</strong><br/>
          Subdomain: {subdomain}<br/>
          Business ID: {business.id}<br/>
          API URL: {apiUrl}<br/>
          Business Data: {JSON.stringify(business).substring(0, 100)}...
        </div>
      </div>
    );

  } catch (error) {
    console.error('Error fetching business:', error);
    
    const baseUrl = getBaseUrl();
    const apiUrl = `${baseUrl}/api/businesses?slug=${subdomain}`;
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Site Not Found</h1>
          <p className="text-gray-600 mb-4">
            Unable to load business site for: <code className="bg-gray-100 px-2 py-1 rounded">{subdomain}</code>
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
            <h3 className="font-semibold text-red-900 mb-2">Error Details:</h3>
            <p className="text-red-700 text-sm">API URL: {apiUrl}</p>
            <p className="text-red-700 text-sm">{error.message}</p>
            {error.message.includes('401') && (
              <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded">
                <p className="text-yellow-800 text-xs">
                  🔐 API Authentication Issue: The server-side call is being rejected. 
                  This might be due to CORS or authentication differences between browser and server calls.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
