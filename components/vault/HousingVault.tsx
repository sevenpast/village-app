'use client'

import { useState } from 'react'
import ApartmentViewings from './ApartmentViewings'
import RentalContractReview from './RentalContractReview'

interface HousingVaultProps {
  userId: string
}

type HousingTab = 'viewings' | 'contracts'

export default function HousingVault({ userId }: HousingVaultProps) {
  const [activeTab, setActiveTab] = useState<HousingTab>('viewings')

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2" style={{ color: '#2D5016' }}>
          Housing Vault
        </h2>
        <p className="text-gray-600">
          Track your apartment viewings and review rental contracts
        </p>
      </div>

      {/* Tabs for 2 Sparten */}
      <div className="mb-6 flex gap-2 border-b" style={{ borderColor: '#E5E7EB' }}>
        <button
          onClick={() => setActiveTab('viewings')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'viewings'
              ? 'border-b-2 text-gray-900'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          style={{
            borderBottomColor: activeTab === 'viewings' ? '#2D5016' : 'transparent',
            color: activeTab === 'viewings' ? '#2D5016' : '#6B7280',
          }}
        >
          Apartment Viewings
        </button>
        <button
          onClick={() => setActiveTab('contracts')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'contracts'
              ? 'border-b-2 text-gray-900'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          style={{
            borderBottomColor: activeTab === 'contracts' ? '#2D5016' : 'transparent',
            color: activeTab === 'contracts' ? '#2D5016' : '#6B7280',
          }}
        >
          Check Your Rental Contract
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'viewings' && <ApartmentViewings userId={userId} />}
        {activeTab === 'contracts' && <RentalContractReview />}
      </div>
    </div>
  )
}

