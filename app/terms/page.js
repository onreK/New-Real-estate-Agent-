export const metadata = {
  title: 'Terms of Service — BizzyBot AI',
  description: 'The terms and conditions governing your use of BizzyBot AI.',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#070B14] text-gray-300">
      {/* Nav bar */}
      <nav className="border-b border-white/5 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="text-white font-bold text-lg tracking-tight">BizzyBot AI</a>
          <a href="/" className="text-sm text-gray-400 hover:text-white transition-colors">← Back to home</a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">Terms of Service</h1>
          <p className="text-gray-500 text-sm">Last updated: May 26, 2026 · Effective: May 26, 2026</p>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed">

          {/* Intro */}
          <section>
            <p>
              These Terms of Service ("Terms") are a legal agreement between you ("Customer," "you," or "your") and BizzyBot AI ("BizzyBot," "we," "us," or "our") governing your access to and use of the BizzyBot platform, website, APIs, and related services (collectively, the "Service"). By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
            </p>
          </section>

          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Service Description</h2>
            <p className="mb-3">
              BizzyBot is an AI-powered customer engagement platform that helps businesses automate lead responses across multiple communication channels, including:
            </p>
            <ul className="space-y-1.5 pl-4">
              {[
                'Email (via Gmail OAuth integration)',
                'SMS (via Twilio)',
                'Web chat widget (embeddable on any website)',
                'Facebook Messenger and Instagram Direct Messages',
                'AI lead scoring, classification, and conversation history',
                'Business analytics and reporting',
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-violet-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              The specific features available to you depend on your subscription plan (Starter, Professional, or Business).
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Account Registration & Eligibility</h2>
            <ul className="space-y-2 pl-4">
              {[
                'You must be at least 18 years old and have the legal capacity to enter into a binding contract.',
                'You must provide accurate, current, and complete information during registration and keep it updated.',
                'You are responsible for maintaining the confidentiality of your login credentials.',
                'You are responsible for all activity that occurs under your account.',
                'You may not use the Service on behalf of a business if you are not authorized to bind that business to these Terms.',
                'One person or legal entity may not create more than one free trial account.',
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-violet-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Free Trial</h2>
            <p className="mb-3">
              New accounts receive a 14-day free trial with access to Starter plan features. At the end of the trial:
            </p>
            <ul className="space-y-1.5 pl-4">
              {[
                'Your account will be downgraded and AI automation will pause unless you add a payment method and select a plan.',
                'No charge is made during the trial period.',
                'Trial accounts may not be used to circumvent subscription limits — creating multiple trial accounts is prohibited.',
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-violet-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Subscriptions & Billing</h2>

            <h3 className="text-base font-semibold text-gray-200 mb-2">4.1 Plans & Pricing</h3>
            <p className="mb-4">
              BizzyBot offers three paid subscription plans billed monthly: Starter ($29/month), Professional ($69/month), and Business ($199/month). Current pricing is available at{' '}
              <a href="https://bizzybotai.com/#pricing" className="text-violet-400 hover:text-violet-300">bizzybotai.com</a>.
              Prices may change with 30 days' prior notice to your account email.
            </p>

            <h3 className="text-base font-semibold text-gray-200 mb-2">4.2 Automatic Renewal</h3>
            <p className="mb-4">
              Subscriptions renew automatically each month on your billing date unless you cancel before the renewal date. By subscribing, you authorize us to charge your payment method on each renewal date.
            </p>

            <h3 className="text-base font-semibold text-gray-200 mb-2">4.3 Payment Processing</h3>
            <p className="mb-4">
              All payments are processed by Stripe. BizzyBot does not store payment card details. By subscribing, you agree to Stripe's{' '}
              <a href="https://stripe.com/legal/ssa" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline">terms of service</a>.
            </p>

            <h3 className="text-base font-semibold text-gray-200 mb-2">4.4 Cancellation</h3>
            <p className="mb-4">
              You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of your current billing period — you retain access until that date.
            </p>

            <h3 className="text-base font-semibold text-gray-200 mb-2">4.5 Refunds</h3>
            <p>
              All sales are final. We do not offer refunds for partial months or unused portions of a subscription period. If you believe you were charged in error, contact{' '}
              <a href="mailto:support@bizzybotai.com" className="text-violet-400 hover:text-violet-300">support@bizzybotai.com</a>{' '}
              within 7 days of the charge and we will review the case.
            </p>
          </section>

          {/* 5 */}
          <section className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">5. SMS Messaging Terms</h2>
            <p className="mb-4">
              When you use BizzyBot's SMS channel, the following terms apply to all text messages sent through the platform on your behalf:
            </p>
            <ul className="space-y-2 pl-4 mb-4">
              <li className="flex gap-2"><span className="text-violet-400 mt-1">•</span><span>BizzyBot sends SMS messages to consumers on your behalf only in response to inbound consumer-initiated contact. No unsolicited outbound SMS messages are sent.</span></li>
              <li className="flex gap-2"><span className="text-violet-400 mt-1">•</span><span>Message frequency varies based on consumer inquiries and your configured follow-up settings. You may receive up to several messages per active conversation.</span></li>
              <li className="flex gap-2"><span className="text-violet-400 mt-1">•</span><span><strong className="text-gray-100">Message and data rates may apply.</strong> Standard carrier rates apply to all SMS messages sent or received through the platform.</span></li>
              <li className="flex gap-2"><span className="text-violet-400 mt-1">•</span><span>All SMS messages include opt-out instructions. Consumers may reply <strong className="text-gray-100">STOP</strong> at any time to stop receiving messages. Reply <strong className="text-gray-100">HELP</strong> for assistance. Opt-out requests are processed immediately.</span></li>
              <li className="flex gap-2"><span className="text-violet-400 mt-1">•</span><span><strong className="text-gray-100">Carriers are not liable for delayed or undelivered messages.</strong></span></li>
              <li className="flex gap-2"><span className="text-violet-400 mt-1">•</span><span>Mobile information — including phone numbers, SMS content, and opt-in/opt-out status — is never shared with third parties for marketing purposes. See our <a href="/privacy" className="text-violet-400 hover:text-violet-300">Privacy Policy</a> for full details.</span></li>
              <li className="flex gap-2"><span className="text-violet-400 mt-1">•</span><span>You are responsible for ensuring that all contacts you message through BizzyBot have provided appropriate consent to receive SMS communications from your business.</span></li>
            </ul>
            <p className="text-sm text-gray-500">
              For SMS support, contact <a href="mailto:support@bizzybotai.com" className="text-violet-400 hover:text-violet-300">support@bizzybotai.com</a>.
            </p>
          </section>

          {/* 6 */}
          <section className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">6. Gmail Integration Terms</h2>
            <p className="mb-4">
              If you connect a Gmail account, the following terms apply in addition to our{' '}
              <a href="/privacy" className="text-violet-400 hover:text-violet-300">Privacy Policy</a>{' '}
              and Google's Terms of Service:
            </p>
            <ul className="space-y-2 pl-4">
              {[
                'You grant BizzyBot limited OAuth access to read incoming emails and send replies on your behalf, as described in our Privacy Policy.',
                'You remain the owner of and solely responsible for all email content sent from your Gmail address, including AI-generated messages.',
                'You are responsible for ensuring that your use of email automation complies with applicable anti-spam laws (CAN-SPAM, CASL, GDPR, etc.) and any applicable industry regulations.',
                'You must not use BizzyBot to send unsolicited bulk email or to contact individuals who have not consented to receive messages from you.',
                'You may revoke Gmail access at any time from your BizzyBot dashboard or from your Google Account settings at myaccount.google.com/permissions.',
                'BizzyBot will not access your Gmail beyond what is necessary to provide the email AI service.',
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-violet-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Acceptable Use</h2>
            <p className="mb-3">You agree not to use the Service to:</p>
            <ul className="space-y-2 pl-4">
              {[
                'Violate any applicable law or regulation.',
                'Send spam, unsolicited messages, or bulk communications to contacts who have not opted in.',
                'Harass, threaten, defame, or discriminate against any individual or group.',
                'Impersonate another person, business, or entity.',
                'Transmit viruses, malware, or any other malicious code.',
                'Reverse engineer, decompile, or attempt to extract source code from the Service.',
                'Use the Service to compete with BizzyBot or to build a competing product.',
                'Circumvent any rate limits, access controls, or security measures.',
                'Scrape or harvest data from the platform in an automated manner.',
                'Use the Service in any manner that could damage, disable, or overburden our infrastructure.',
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-red-400/70 mt-1">✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              We reserve the right to suspend or terminate accounts that violate these policies without notice.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. AI-Generated Content Disclaimer</h2>
            <p className="mb-3">
              BizzyBot uses artificial intelligence (OpenAI GPT models) to generate responses on your behalf. You acknowledge and agree that:
            </p>
            <ul className="space-y-1.5 pl-4">
              {[
                'AI-generated responses may contain errors, inaccuracies, or content that does not reflect your actual business policies.',
                'You are solely responsible for reviewing, monitoring, and taking accountability for all messages sent from your account, whether AI-generated or manual.',
                'BizzyBot provides the AI as a tool — it is not a substitute for professional advice (legal, medical, financial, or otherwise).',
                'You should configure the AI with accurate business information and regularly review its output to ensure it represents your business appropriately.',
                'BizzyBot is not liable for business outcomes, lost deals, or customer dissatisfaction caused by AI-generated responses.',
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-violet-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Intellectual Property</h2>
            <p className="mb-3">
              <strong className="text-gray-200">BizzyBot's IP:</strong> The Service, including its software, design, brand, and content, is owned by BizzyBot AI and protected by intellectual property laws. You may not copy, distribute, or create derivative works from our platform without written permission.
            </p>
            <p className="mb-3">
              <strong className="text-gray-200">Your Content:</strong> You retain ownership of all business information, knowledge base content, and conversation data you input into the platform ("Customer Content"). By using the Service, you grant BizzyBot a limited, non-exclusive license to process Customer Content solely to provide the Service to you.
            </p>
            <p>
              <strong className="text-gray-200">Feedback:</strong> If you provide feedback, suggestions, or feature requests, you grant BizzyBot a perpetual, royalty-free license to use that feedback to improve the Service, without obligation to compensate you.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Privacy & Data</h2>
            <p>
              Your use of the Service is subject to our{' '}
              <a href="/privacy" className="text-violet-400 hover:text-violet-300">Privacy Policy</a>,
              which is incorporated into these Terms by reference. By using the Service, you consent to our data practices as described in the Privacy Policy.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">11. Service Availability & Modifications</h2>
            <p className="mb-3">
              We strive for high availability but do not guarantee uninterrupted, error-free, or timely access to the Service. We may:
            </p>
            <ul className="space-y-1.5 pl-4">
              {[
                'Perform scheduled maintenance (we will endeavor to give advance notice when possible).',
                'Modify, add, or remove features at any time with or without notice.',
                'Discontinue the Service entirely with 30 days\' prior written notice.',
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-violet-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">12. Termination</h2>
            <p className="mb-3">
              <strong className="text-gray-200">By you:</strong> You may terminate your account at any time by canceling your subscription and deleting your account from the settings page.
            </p>
            <p className="mb-3">
              <strong className="text-gray-200">By BizzyBot:</strong> We may suspend or terminate your account immediately if you: (a) violate these Terms; (b) engage in fraudulent or illegal activity; (c) fail to pay fees owed; or (d) in our sole discretion pose a risk to the Service or other users.
            </p>
            <p>
              Upon termination, your access ends immediately and your data will be retained for 30 days then permanently deleted, per our Privacy Policy.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">13. Disclaimers</h2>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <p className="uppercase text-xs font-semibold text-gray-500 tracking-widest mb-3">Important — Please read carefully</p>
              <p className="mb-3">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ACCURACY OF AI-GENERATED CONTENT.
              </p>
              <p>
                BIZZYBOT DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR FREE OF ERRORS, OR THAT ANY DEFECTS WILL BE CORRECTED.
              </p>
            </div>
          </section>

          {/* 14 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">14. Limitation of Liability</h2>
            <p className="mb-3">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, BIZZYBOT AI AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="space-y-1.5 pl-4 mb-4">
              {[
                'Loss of profits, revenue, data, business opportunities, or goodwill.',
                'Costs of substitute services.',
                'Damages resulting from AI-generated messages sent on your behalf.',
                'Unauthorized access to or alteration of your data.',
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-violet-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>
              BIZZYBOT'S TOTAL CUMULATIVE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE TOTAL FEES PAID BY YOU IN THE THREE MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED DOLLARS ($100).
            </p>
          </section>

          {/* 15 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">15. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless BizzyBot AI and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or in any way connected with: (a) your access to or use of the Service; (b) your violation of these Terms; (c) messages sent from your account; or (d) your violation of any third-party right.
            </p>
          </section>

          {/* 16 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">16. Governing Law & Dispute Resolution</h2>
            <p className="mb-3">
              These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles.
            </p>
            <p className="mb-3">
              Any dispute arising from these Terms or the Service shall first be attempted to be resolved through informal negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration under the rules of the American Arbitration Association (AAA). The arbitration will be conducted in English on a remote basis.
            </p>
            <p>
              You waive any right to participate in a class action lawsuit or class-wide arbitration. Each party shall bring claims against the other only in an individual capacity, not as a plaintiff or class member in any purported class or representative proceeding.
            </p>
          </section>

          {/* 17 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">17. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. When we make material changes, we will notify you by email at least 14 days before the new Terms take effect. Your continued use of the Service after the effective date constitutes acceptance of the updated Terms. If you disagree with the changes, you may cancel your subscription before they take effect.
            </p>
          </section>

          {/* 18 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">18. Miscellaneous</h2>
            <ul className="space-y-2 pl-4">
              {[
                'These Terms constitute the entire agreement between you and BizzyBot regarding the Service and supersede all prior agreements.',
                'If any provision is found unenforceable, the remaining provisions remain in full force.',
                'BizzyBot\'s failure to enforce any right or provision does not waive that right.',
                'You may not assign these Terms or your account without BizzyBot\'s prior written consent.',
                'Sections 7, 11–15 survive termination of these Terms.',
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-violet-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 19 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">19. Contact Us</h2>
            <p className="mb-3">
              Questions about these Terms? Reach us at:
            </p>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-1.5">
              <p><span className="text-gray-500">Company:</span> <span className="text-gray-200">BizzyBot AI</span></p>
              <p><span className="text-gray-500">Legal inquiries:</span>{' '}<a href="mailto:legal@bizzybotai.com" className="text-violet-400 hover:text-violet-300">legal@bizzybotai.com</a></p>
              <p><span className="text-gray-500">General support:</span>{' '}<a href="mailto:support@bizzybotai.com" className="text-violet-400 hover:text-violet-300">support@bizzybotai.com</a></p>
              <p><span className="text-gray-500">Website:</span>{' '}<a href="https://bizzybotai.com" className="text-violet-400 hover:text-violet-300">bizzybotai.com</a></p>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row gap-4 justify-between text-sm text-gray-600">
            <div className="flex gap-6">
              <a href="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
              <a href="/" className="hover:text-gray-400 transition-colors">Home</a>
            </div>
            <p>© 2026 BizzyBot AI. All rights reserved.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
