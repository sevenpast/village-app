'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const testData = async () => {
      try {
        // Test form schema
        console.log('🧪 Testing form schema...')
        const schemaResponse = await fetch('/api/config/form/registration')
        const schemaData = await schemaResponse.json()
        console.log('📋 Form schema:', schemaData)

        // Test profile data with admin
        console.log('🧪 Testing profile data...')
        const profileResponse = await fetch('/api/debug/profile')
        const profileData = await profileResponse.json()
        console.log('👤 Profile data:', profileData)

        setData({
          schema: schemaData,
          profile: profileData,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error('❌ Debug error:', error)
        setData({ error: error.message })
      } finally {
        setLoading(false)
      }
    }

    testData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <h1 className="text-2xl font-bold mb-4">Debug Loading...</h1>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Information</h1>

      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Form Schema</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(data?.schema, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Profile Data</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(data?.profile, null, 2)}
          </pre>
        </div>

        <div className="bg-blue-100 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Test Instructions</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Test User Credentials:</strong></p>
            <p>Email: test@example.com</p>
            <p>Password: TestPass123!</p>
            <p><a href="/settings" className="text-blue-600 underline">Go to Settings Page</a></p>
          </div>
        </div>
      </div>
    </div>
  )
}