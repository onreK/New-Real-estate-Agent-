export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Information We Collect</h2>
              <p>
                Bizzy Bot AI collects information you provide when using our AI customer engagement platform, including:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Account information (name, email address)</li>
                <li>Business information you configure</li>
                <li>Chat conversations and messages</li>
                <li>Usage analytics and performance data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Gmail Integration</h2>
              <p>
                When you connect your Gmail account, we access your email data solely to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Read incoming emails to generate AI responses</li>
                <li>Send AI-generated responses from your Gmail account</li>
                <li>Store conversation history for lead tracking</li>
              </ul>
              <p className="mt-2">
                Your Gmail data is processed securely and never shared with third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">How We Use Information</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Provide and improve our AI services</li>
                <li>Generate automated responses to customer inquiries</li>
                <li>Analyze conversation patterns for lead scoring</li>
                <li>Send service updates and support communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Security</h2>
              <p>
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Encrypted data transmission and storage</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security updates and monitoring</li>
                <li>Isolated customer data with strict access controls</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Access, update, or delete your personal information</li>
                <li>Disconnect your Gmail account at any time</li>
                <li>Export your conversation data</li>
                <li>Request data deletion upon account termination</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact</h2>
              <p>
                For privacy questions or concerns, contact us at{' '}
                <a href="mailto:privacy@bizzybotai.com" className="text-blue-600 hover:text-blue-800">
                  privacy@bizzybotai.com
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
