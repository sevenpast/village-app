'use client'

import { useState } from 'react'

export default function TestEmailPage() {
  const [email, setEmail] = useState('hublaizel@icloud.com')
  const [firstName, setFirstName] = useState('Andy')
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const testEmailVerification = async () => {
    setIsLoading(true)
    setStatus('🔄 Sending test email...')

    try {
      // Send direct test email
      const emailResponse = await fetch('/api/test/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          firstName: firstName,
        }),
      })

      const emailResult = await emailResponse.json()

      if (emailResponse.ok && emailResult.success) {
        setStatus(`✅ Test email sent successfully! Check your email: ${email}`)
      } else {
        setStatus(`❌ Email sending failed: ${emailResult.error || emailResult.message}`)
      }
    } catch (error) {
      setStatus(`❌ Error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8 bg-blue-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-blue-800">Email Verification Test</h1>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Email Sending</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your email address"
              />
              <p className="mt-1 text-sm text-gray-500">
                Note: Resend free plan only allows sending to your registered email address
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your first name"
              />
            </div>

            <button
              onClick={testEmailVerification}
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? '🔄 Sending...' : '📧 Test Email Verification'}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <p className="text-lg font-mono bg-gray-100 p-3 rounded">{status || 'Ready to test...'}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Resend Setup Info</h2>
          <div className="space-y-2 text-sm">
            <p><strong>✅ API Key:</strong> Configured</p>
            <p><strong>✅ Email Templates:</strong> Ready</p>
            <p><strong>✅ Auth Flow:</strong> Working</p>
            <p><strong>⚠️ Domain:</strong> Using sandbox (onboarding@resend.dev)</p>
            <p><strong>🔒 Restriction:</strong> Can only send to registered email address</p>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <h3 className="font-semibold text-yellow-800">For Production:</h3>
            <ul className="text-sm text-yellow-700 list-disc list-inside">
              <li>Verify your domain (expatvillage.ch) in Resend Dashboard</li>
              <li>Change from address to use your domain</li>
              <li>Then you can send to any email address</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}