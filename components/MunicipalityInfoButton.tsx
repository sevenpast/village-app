'use client'

import { useState } from 'react'
import { Loader2, RefreshCw, ExternalLink, Clock, Phone, Mail, MapPin, FileText, AlertCircle } from 'lucide-react'

interface MunicipalityData {
  gemeinde_name: string
  ortsteil: string
  opening_hours: Record<string, string> | null
  phone: string | null
  email: string | null
  address: string | null
  required_documents: string[] | null
  registration_fee_chf: number | null
  special_notices: string | null
  website_url: string | null
  cached: boolean
  cached_at: string
}

interface MunicipalityInfoButtonProps {
  municipality: string
  canton?: string
  variant?: 'opening-hours' | 'contact' | 'full'
  className?: string
}

export function MunicipalityInfoButton({
  municipality,
  canton,
  variant = 'full',
  className = '',
}: MunicipalityInfoButtonProps) {
  const [data, setData] = useState<MunicipalityData | null>(null)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInfo = async (forceRefresh = false) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        query: municipality,
        ...(canton && { canton }),
        ...(forceRefresh && { forceRefresh: 'true' }),
      })

      const response = await fetch(`/api/municipality/info?${params}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch municipality data')
      }

      const result = await response.json()
      console.log('Municipality data received:', {
        opening_hours: result.opening_hours,
        has_opening_hours: result.opening_hours && Object.keys(result.opening_hours).length > 0,
        full_data: result
      })
      setData(result)
      setIsOpen(true)

      // Show cache status (optional toast notification)
      if (result.cached && !forceRefresh) {
        const cachedDate = new Date(result.cached_at)
        const hoursAgo = Math.floor((Date.now() - cachedDate.getTime()) / (1000 * 60 * 60))
        console.log(`Daten sind ${hoursAgo}h alt`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Gemeindedaten')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getButtonText = () => {
    if (loading) return 'Lädt...'
    switch (variant) {
      case 'opening-hours':
        return 'Öffnungszeiten'
      case 'contact':
        return 'Kontakt'
      case 'full':
        return 'Gemeinde-Infos'
      default:
        return 'Gemeinde-Infos'
    }
  }

  return (
    <>
      <button
        onClick={() => fetchInfo(false)}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {getButtonText()}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
              <div>
                <h3 className="text-xl font-bold" style={{ color: '#2D5016' }}>
                  {data?.gemeinde_name}
                  {data?.ortsteil && data.ortsteil !== data.gemeinde_name && (
                    <span className="text-gray-600 ml-2 text-lg font-normal">({data.ortsteil})</span>
                  )}
                </h3>
                {data?.cached && (
                  <p className="text-xs text-gray-500 mt-1">
                    Gecacht • {new Date(data.cached_at).toLocaleString('de-CH')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchInfo(true)}
                  disabled={loading}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Aktualisieren"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false)
                    setError(null)
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Content */}
            {data && !error && (
              <div className="p-6 space-y-6">
                {/* Opening Hours */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#2D5016' }}>
                    <Clock className="w-5 h-5" />
                    Öffnungszeiten
                  </h4>
                  {data.opening_hours && Object.keys(data.opening_hours).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(data.opening_hours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between text-sm">
                          <span className="text-gray-600">{day}</span>
                          <span className="font-mono font-medium">{hours}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      Öffnungszeiten nicht verfügbar. Bitte besuche die offizielle Website oder rufe die Gemeinde direkt an.
                    </div>
                  )}
                </div>

                {/* Contact Info */}
                {(data.phone || data.email || data.address) && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#2D5016' }}>
                      Kontakt
                    </h4>
                    <div className="space-y-2 text-sm">
                      {data.address && (
                        <p className="flex items-start gap-2 text-gray-700">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{data.address}</span>
                        </p>
                      )}
                      {data.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span className="text-gray-600">Tel: </span>
                          <a href={`tel:${data.phone}`} className="underline text-blue-600">
                            {data.phone}
                          </a>
                        </p>
                      )}
                      {data.email && (
                        <p className="flex items-center gap-2">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="text-gray-600">E-Mail: </span>
                          <a href={`mailto:${data.email}`} className="underline text-blue-600">
                            {data.email}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Required Documents */}
                {data.required_documents && data.required_documents.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#2D5016' }}>
                      <FileText className="w-5 h-5" />
                      Benötigte Dokumente
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {data.required_documents.map((doc, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span style={{ color: '#2D5016' }}>•</span>
                          <span className="text-gray-700">{doc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Registration Fee */}
                {data.registration_fee_chf && (
                  <div>
                    <h4 className="font-semibold mb-2" style={{ color: '#2D5016' }}>
                      Gebühr
                    </h4>
                    <p className="text-sm text-gray-700">ca. CHF {data.registration_fee_chf}</p>
                  </div>
                )}

                {/* Special Notices */}
                {data.special_notices && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-900">{data.special_notices}</p>
                    </div>
                  </div>
                )}

                {/* Official Website Link */}
                {data.website_url && (
                  <div className="pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                    <a
                      href={data.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 underline flex items-center gap-1 hover:text-blue-800"
                    >
                      Offizielle Website öffnen
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <p className="text-xs text-gray-500 mt-2">
                      Bitte überprüfe die Informationen auf der offiziellen Website, bevor du deine Gemeinde besuchst.
                    </p>
                  </div>
                )}

                {/* No Data Message */}
                {!data.opening_hours &&
                  !data.phone &&
                  !data.email &&
                  !data.address &&
                  !data.required_documents &&
                  !data.registration_fee_chf &&
                  !data.special_notices && (
                    <div className="text-center py-8 text-gray-500">
                      <p>Keine Informationen verfügbar.</p>
                      <p className="text-sm mt-2">
                        Bitte besuche die offizielle Website für aktuelle Informationen.
                      </p>
                    </div>
                  )}
              </div>
            )}

            {/* Footer */}
            <div className="p-6 border-t flex justify-end" style={{ borderColor: '#E5E7EB' }}>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setError(null)
                }}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: '#E5E7EB', color: '#374151' }}
              >
                Schliessen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

