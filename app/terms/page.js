export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Acceptance of Terms</h2>
              <p>
                By accessing and using Bizzy Bot AI, you accept and agree to be bound by the terms 
                and provision of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Service Description</h2>
              <p>
                Bizzy Bot AI provides AI-powered customer engagement tools, including:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Automated chat responses</li>
                <li>Gmail integration for email automation</li>
                <li>Lead scoring and detection</li>
                <li>Customer conversation management</li>
                <li>Business analytics and reporting</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">User Responsibilities</h2>
              <p>As a user of our service, you agree to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Provide accurate account and business information</li>
                <li>Use the service in compliance with applicable laws</li>
                <li>Not misuse or attempt to hack our systems</li>
                <li>Respect the privacy and rights of your customers</li>
                <li>Monitor AI-generated responses for accuracy</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Gmail Integration Terms</h2>
              <p>When using Gmail integration:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>You grant us permission to access your Gmail account</li>
                <li>You remain responsible for all emails sent from your account</li>
                <li>You can revoke access at any time through your Google account settings</li>
                <li>We will only access emails necessary for providing our service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">AI Response Disclaimer</h2>
              <p>
                Our AI generates automated responses based on your configuration and training data. 
                While we strive for accuracy, you are responsible for:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Reviewing and monitoring AI responses</li>
                <li>Ensuring responses align with your business practices</li>
                <li>Correcting any inaccurate or inappropriate responses</li>
                <li>Complying with industry regulations and standards</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Service Availability</h2>
              <p>
                We strive to maintain high service availability but do not guarantee uninterrupted access. 
                Scheduled maintenance and updates may temporarily affect service availability.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Termination</h2>
              <p>
                Either party may terminate this agreement at any time. Upon termination:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Your access to the service will be discontinued</li>
                <li>Your data will be retained for 30 days for potential recovery</li>
                <li>After 30 days, your data will be permanently deleted</li>
                <li>You can export your data before termination</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Limitation of Liability</h2>
              <p>
                Bizzy Bot AI is provided "as is" without warranties. We are not liable for any 
                indirect, incidental, or consequential damages arising from use of our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact Information</h2>
              <p>
                For questions about these terms, contact us at{' '}
                <a href="mailto:legal@bizzybotai.com" className="text-blue-600 hover:text-blue-800">
                  legal@bizzybotai.com
                </a>
              </p>
            </section>

            <section className="border-t pt-6 mt-8">
              <p className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
