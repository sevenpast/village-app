'use client'

import { useState, useEffect, useRef } from 'react'
import { useFormContext } from 'react-hook-form'
import { MapPin, X } from 'lucide-react'

interface AddressAutocompleteProps {
  fieldName: string
  label: string
  required?: boolean
}

/**
 * Address Autocomplete Component using Nominatim
 * Supports PLZ (postal code) and city autocomplete for Swiss addresses
 */
export default function AddressAutocomplete({
  fieldName,
  label,
  required = false,
}: AddressAutocompleteProps) {
  const { register, setValue, watch } = useFormContext()
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<any>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Watch all address fields
  const street = watch(`${fieldName}_street`) || ''
  const number = watch(`${fieldName}_number`) || ''
  const plz = watch(`${fieldName}_plz`) || ''
  const city = watch(`${fieldName}_city`) || ''

  // Debounced search function
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.length < 3) {
      setSuggestions([])
      return
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchAddresses(searchQuery)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchAddresses = async (query: string) => {
    setIsLoading(true)
    try {
      // Strategy 1: Try Supabase postal codes autocomplete first (fast, Swiss-specific)
      try {
        const response = await fetch(
          `/api/places/autocomplete?q=${encodeURIComponent(query)}&limit=10`
        )
        
        if (response.ok) {
          const data = await response.json()
          if (data && data.length > 0) {
            // Convert Supabase format to suggestion format
            const formatted = data.map((item: any) => ({
              display_name: `${item.postalcode} ${item.place_name}`,
              address: {
                postcode: item.postalcode,
                city: item.place_name,
                municipality: item.municipality_name,
                canton: item.canton_abbr,
              },
              lat: item.lat,
              lon: item.lng,
              // Store original data for form filling
              _postal_data: item,
            }))
            setSuggestions(formatted)
            setShowSuggestions(true)
            return
          }
        }
      } catch (supabaseError) {
        console.warn('Supabase autocomplete failed, falling back to Nominatim:', supabaseError)
      }

      // Strategy 2: Fallback to Nominatim API for Swiss addresses
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(query)}&` +
          `countrycodes=ch&` +
          `addressdetails=1&` +
          `limit=5&` +
          `format=json&` +
          `email=hello@expatvillage.ch` // Required by Nominatim ToS
      )

      if (!response.ok) {
        throw new Error('Address search failed')
      }

      const data = await response.json()
      setSuggestions(data)
      setShowSuggestions(true)
    } catch (error) {
      console.error('Address autocomplete error:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  const selectAddress = (address: any) => {
    // Check if this is from Supabase postal codes (has _postal_data)
    if (address._postal_data) {
      const data = address._postal_data
      // Fill form fields from Supabase data
      setValue(`${fieldName}_street`, '', { shouldDirty: true })
      setValue(`${fieldName}_number`, '', { shouldDirty: true })
      setValue(`${fieldName}_plz`, data.postalcode, { shouldDirty: true })
      setValue(`${fieldName}_city`, data.place_name, { shouldDirty: true })
      // Always set municipality_name from Supabase data (most reliable source)
      if (data.municipality_name) {
        console.log('📍 Setting municipality_name from Supabase data:', data.municipality_name)
        setValue('municipality_name', data.municipality_name, { shouldDirty: true })
      } else if (data.place_name) {
        // Fallback to place_name if municipality_name not available
        console.log('📍 Setting municipality_name from place_name (fallback):', data.place_name)
        setValue('municipality_name', data.place_name, { shouldDirty: true })
      }
    } else {
      // Original Nominatim format
      const addressDetails = address.address || {}
      
      // Extract address components
      const streetName = addressDetails.road || addressDetails.street || ''
      const houseNumber = addressDetails.house_number || ''
      const postalCode = addressDetails.postcode || ''
      const cityName = addressDetails.city || 
                       addressDetails.town || 
                       addressDetails.village || 
                       addressDetails.municipality || ''
      const municipalityName = addressDetails.municipality || cityName || ''

      // Fill form fields
      setValue(`${fieldName}_street`, streetName, { shouldDirty: true })
      setValue(`${fieldName}_number`, houseNumber, { shouldDirty: true })
      setValue(`${fieldName}_plz`, postalCode, { shouldDirty: true })
      setValue(`${fieldName}_city`, cityName, { shouldDirty: true })
      
      // Set municipality_name from Nominatim data
      if (municipalityName) {
        console.log('📍 Setting municipality_name from Nominatim data:', municipalityName)
        setValue('municipality_name', municipalityName, { shouldDirty: true })
      }
    }

    setSelectedAddress(address)
    setSearchQuery('')
    setShowSuggestions(false)
  }

  // Format suggestion for display
  const formatSuggestion = (address: any) => {
    // Supabase postal codes format
    if (address._postal_data) {
      const data = address._postal_data
      const parts = [
        `${data.postalcode} ${data.place_name}`,
      ]
      if (data.municipality_name !== data.place_name) {
        parts.push(data.municipality_name)
      }
      parts.push(`(${data.canton_abbr})`)
      return parts.join(', ')
    }
    
    // Original Nominatim format
    const addr = address.address || {}
    const parts = []
    
    if (addr.road) parts.push(addr.road)
    if (addr.house_number) parts.push(addr.house_number)
    if (addr.postcode) parts.push(addr.postcode)
    if (addr.city || addr.town || addr.village) {
      parts.push(addr.city || addr.town || addr.village)
    }

    return parts.length > 0 ? parts.join(', ') : address.display_name
  }

  return (
    <div className="mb-4">
      <label
        className="block text-sm font-medium mb-2"
        style={{ color: '#2D5016' }}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Search Input */}
      <div className="relative mb-3">
        <div className="relative">
          <MapPin
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true)
              }
            }}
            placeholder="Search by postal code or city (e.g., 8000 Zürich)"
            className="w-full pl-10 pr-10 px-4 py-3 bg-white border rounded-md focus:outline-none focus:ring-2"
            style={{
              borderColor: '#2D5016',
              borderWidth: '1px',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setSuggestions([])
                setShowSuggestions(false)
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto"
            style={{
              borderColor: '#2D5016',
              borderWidth: '1px',
            }}
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectAddress(suggestion)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                style={{ borderColor: '#E5E7EB' }}
              >
                <div className="font-medium" style={{ color: '#374151' }}>
                  {formatSuggestion(suggestion)}
                </div>
                {suggestion.display_name !== formatSuggestion(suggestion) && (
                  <div className="text-sm text-gray-500 mt-1">
                    {suggestion.display_name}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
          </div>
        )}
      </div>

      {/* Address Fields (pre-filled by autocomplete or manual entry) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`${fieldName}_street`}
            className="block text-sm font-medium mb-1"
            style={{ color: '#2D5016' }}
          >
            Street
          </label>
          <input
            type="text"
            id={`${fieldName}_street`}
            {...register(`${fieldName}_street`)}
            value={street}
            onChange={(e) => setValue(`${fieldName}_street`, e.target.value)}
            className="w-full px-4 py-3 bg-white border rounded-md focus:outline-none focus:ring-2"
            style={{
              borderColor: '#2D5016',
              borderWidth: '1px',
            }}
            placeholder="Street name"
          />
        </div>

        <div>
          <label
            htmlFor={`${fieldName}_number`}
            className="block text-sm font-medium mb-1"
            style={{ color: '#2D5016' }}
          >
            Number
          </label>
          <input
            type="text"
            id={`${fieldName}_number`}
            {...register(`${fieldName}_number`)}
            value={number}
            onChange={(e) => setValue(`${fieldName}_number`, e.target.value)}
            className="w-full px-4 py-3 bg-white border rounded-md focus:outline-none focus:ring-2"
            style={{
              borderColor: '#2D5016',
              borderWidth: '1px',
            }}
            placeholder="House number"
          />
        </div>

        <div>
          <label
            htmlFor={`${fieldName}_plz`}
            className="block text-sm font-medium mb-1"
            style={{ color: '#2D5016' }}
          >
            Postal Code
          </label>
          <input
            type="text"
            id={`${fieldName}_plz`}
            {...register(`${fieldName}_plz`, {
              pattern: {
                value: /^[0-9]{4}$/,
                message: 'Swiss postal codes are 4 digits',
              },
            })}
            value={plz}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 4)
              setValue(`${fieldName}_plz`, value)
              // Auto-search when PLZ is complete (4 digits)
              if (value.length === 4) {
                searchAddresses(value)
              }
            }}
            className="w-full px-4 py-3 bg-white border rounded-md focus:outline-none focus:ring-2"
            style={{
              borderColor: '#2D5016',
              borderWidth: '1px',
            }}
            placeholder="8000"
            maxLength={4}
          />
        </div>

        <div>
          <label
            htmlFor={`${fieldName}_city`}
            className="block text-sm font-medium mb-1"
            style={{ color: '#2D5016' }}
          >
            City
          </label>
          <input
            type="text"
            id={`${fieldName}_city`}
            {...register(`${fieldName}_city`)}
            value={city}
            onChange={(e) => setValue(`${fieldName}_city`, e.target.value)}
            className="w-full px-4 py-3 bg-white border rounded-md focus:outline-none focus:ring-2"
            style={{
              borderColor: '#2D5016',
              borderWidth: '1px',
            }}
            placeholder="City name"
          />
        </div>
      </div>

      {selectedAddress && (
        <p className="mt-2 text-sm text-gray-600">
          ✓ Address selected: {formatSuggestion(selectedAddress)}
        </p>
      )}
    </div>
  )
}


