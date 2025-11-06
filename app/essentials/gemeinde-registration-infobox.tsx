'use client'

import { useEffect, useState } from 'react'
import { getMunicipalityUrl } from '@/lib/municipality-urls'

interface GemeindeRegistrationInfoboxProps {
  infobox: any
  municipalityName: string | null
}

export default function GemeindeRegistrationInfobox({
  infobox,
  municipalityName,
}: GemeindeRegistrationInfoboxProps) {
  const [municipalityInfo, setMunicipalityInfo] = useState<any>(null)
  const [loadingMunicipality, setLoadingMunicipality] = useState(false)

  useEffect(() => {
    if (municipalityName) {
      loadMunicipalityInfo(municipalityName)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipalityName])

  const loadMunicipalityInfo = async (name: string) => {
    setLoadingMunicipality(true)
    try {
      // Use new municipality info API
      const response = await fetch(`/api/municipality/info?query=${encodeURIComponent(name)}`)
      if (response.ok) {
        const info = await response.json()
        setMunicipalityInfo(info)
      }
    } catch (error) {
      console.error('Error loading municipality info:', error)
    } finally {
      setLoadingMunicipality(false)
    }
  }


  return (
    <div className="space-y-4">
      <p className="text-sm font-medium mb-4" style={{ color: '#374151' }}>
        The following information is relevant to you since you are a citizen of{' '}
        <strong style={{ color: '#2D5016' }}>{infobox.country_name}</strong>.
      </p>
      {infobox.faqs?.map((faq: any, index: number) => (
        <div key={index} className="space-y-2">
          <h4 className="font-semibold text-base mt-4" style={{ color: '#2D5016' }}>
            {faq.question}
          </h4>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#374151' }}>
            {faq.answer.split('→').map((part: string, partIndex: number) => {
              if (partIndex === 0) return part
              return (
                <span key={partIndex}>
                  →{part}
                </span>
              )
            })}
          </p>
          
          {/* Show opening hours after "Where do I go to register?" */}
          {faq.show_opening_hours && municipalityName && (
            <div className="mt-3 p-3 rounded-md" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <h5 className="font-semibold text-sm mb-2" style={{ color: '#2D5016' }}>
                {municipalityName} Office Hours:
              </h5>
              {loadingMunicipality ? (
                <p className="text-xs text-gray-500">Loading opening hours...</p>
              ) : municipalityInfo?.opening_hours && Object.keys(municipalityInfo.opening_hours).length > 0 ? (
                <>
                  <div className="space-y-1 text-sm">
                    {Object.entries(municipalityInfo.opening_hours).map(([day, hours]) => (
                      <div key={day} className="flex justify-between">
                        <span className="text-gray-600">{day}</span>
                        <span className="font-mono font-medium">{hours as string}</span>
                      </div>
                    ))}
                  </div>
                  {municipalityInfo.phone && (
                    <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                      Phone:{' '}
                      <a
                        href={`tel:${municipalityInfo.phone}`}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {municipalityInfo.phone}
                      </a>
                    </p>
                  )}
                  {municipalityInfo.email && (
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      Email:{' '}
                      <a
                        href={`mailto:${municipalityInfo.email}`}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {municipalityInfo.email}
                      </a>
                    </p>
                  )}
                  {municipalityInfo.cached && (
                    <p className="text-xs mt-2 italic" style={{ color: '#9CA3AF' }}>
                      (Information cached • Last updated: {new Date(municipalityInfo.cached_at).toLocaleDateString('de-CH')})
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Monday - Friday: 08:00 - 12:00, 14:00 - 17:00
                  <br />
                  <span className="text-xs italic">(Please verify with your local municipality office)</span>
                </p>
              )}
            </div>
          )}

          {index < infobox.faqs.length - 1 && (
            <div className="border-t my-4" style={{ borderColor: '#E5E7EB' }} />
          )}
        </div>
      ))}
    </div>
  )
}

