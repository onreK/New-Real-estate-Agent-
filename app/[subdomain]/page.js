{/* Embed Code */}
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg mb-6 font-mono text-sm overflow-x-auto">
              <div className="whitespace-nowrap">
                {`<script src="${process.env.NEXT_PUBLIC_APP_URL || 'https://yoursite.com'}/api/widget/${subdomain}/widget.js"></script>`}
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-yellow-800 mb-2">🔒 Secure Widget</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>✅ Requires active subscription to function</li>
                <li>✅ Automatically disables if payment fails</li>
                <li>✅ Real-time authentication every 5 minutes</li>
                <li>✅ Cannot be copied or stolen</li>
              </ul>
            </div>
