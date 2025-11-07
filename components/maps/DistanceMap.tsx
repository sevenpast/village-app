'use client'

import { useState, useEffect, useRef } from 'react'

// Leaflet types
declare global {
  interface Window {
    L: any
  }
}

export default function DistanceMap() {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [distance, setDistance] = useState<string | null>(null)
  const [duration, setDuration] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const routeLayerRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)

  // Load Leaflet CSS and JS
  useEffect(() => {
    // Load Leaflet CSS
    const linkId = 'leaflet-css'
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link')
      link.id = linkId
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
      link.crossOrigin = ''
      document.head.appendChild(link)
    }

    // Load Leaflet JS
    const scriptId = 'leaflet-js'
    if (document.getElementById(scriptId)) {
      if (window.L) {
        initializeMap()
        return
      }
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.integrity = 'sha256-20nQCchN9ahp8HyzILr3lLmkfTCXYlKBXuifE5pgQcQ='
    script.crossOrigin = ''
    script.async = true

    script.onload = () => {
      initializeMap()
    }

    script.onerror = () => {
      setError('Failed to load map library. Please check your internet connection.')
    }

    document.head.appendChild(script)

    return () => {
      // Cleanup
      if (markersRef.current.length > 0) {
        markersRef.current.forEach(marker => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(marker)
          }
        })
        markersRef.current = []
      }
      if (routeLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(routeLayerRef.current)
      }
    }
  }, [])

  const initializeMap = () => {
    if (!mapRef.current || !window.L) return

    // Initialize map centered on Switzerland
    const map = window.L.map(mapRef.current).setView([46.8182, 8.2275], 7)

    // Add OpenStreetMap tile layer
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    mapInstanceRef.current = map
    setMapLoaded(true)
  }

  const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
    try {
      // Use Nominatim (OpenStreetMap geocoding service) - free, no API key needed
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'VillageApp/1.0', // Required by Nominatim
          },
        }
      )

      if (!response.ok) {
        throw new Error('Geocoding failed')
      }

      const data = await response.json()
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
      }
      return null
    } catch (err) {
      console.error('Geocoding error:', err)
      return null
    }
  }

  const calculateRoute = async () => {
    if (!origin.trim() || !destination.trim()) {
      setError('Please enter both origin and destination')
      return
    }

    if (!mapInstanceRef.current || !window.L) {
      setError('Map is not loaded yet. Please wait a moment.')
      return
    }

    setLoading(true)
    setError(null)
    setDistance(null)
    setDuration(null)

    // Clear previous markers and route
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker)
    })
    markersRef.current = []
    if (routeLayerRef.current) {
      mapInstanceRef.current.removeLayer(routeLayerRef.current)
    }

    try {
      // Geocode both addresses
      const [originCoords, destCoords] = await Promise.all([
        geocodeAddress(origin),
        geocodeAddress(destination),
      ])

      if (!originCoords) {
        setError(`Could not find location: ${origin}`)
        setLoading(false)
        return
      }

      if (!destCoords) {
        setError(`Could not find location: ${destination}`)
        setLoading(false)
        return
      }

      // Add markers
      const originIcon = window.L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })

      const destIcon = window.L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })

      const originMarker = window.L.marker(originCoords, { icon: originIcon }).addTo(mapInstanceRef.current)
        .bindPopup(`<b>From:</b> ${origin}`).openPopup()
      const destMarker = window.L.marker(destCoords, { icon: destIcon }).addTo(mapInstanceRef.current)
        .bindPopup(`<b>To:</b> ${destination}`)

      markersRef.current = [originMarker, destMarker]

      // Calculate route using OSRM (Open Source Routing Machine) - free, no API key needed
      const routeUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords[1]},${originCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`

      const routeResponse = await fetch(routeUrl)
      if (!routeResponse.ok) {
        throw new Error('Route calculation failed')
      }

      const routeData = await routeResponse.json()

      if (routeData.code !== 'Ok') {
        setError('No route found between these locations.')
        setLoading(false)
        return
      }

      // Draw route on map as a polyline
      const routeCoordinates = routeData.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]])
      const routePolyline = window.L.polyline(routeCoordinates, {
        color: '#2D5016',
        weight: 5,
        opacity: 0.8,
        smoothFactor: 1,
      }).addTo(mapInstanceRef.current)

      routeLayerRef.current = routePolyline

      // Fit map to show entire route
      const bounds = window.L.latLngBounds(routeCoordinates)
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] })

      // Calculate distance and duration
      const distanceMeters = routeData.routes[0].distance
      const durationSeconds = routeData.routes[0].duration

      // Format distance
      let distanceText: string
      if (distanceMeters < 1000) {
        distanceText = `${Math.round(distanceMeters)} m`
      } else {
        distanceText = `${(distanceMeters / 1000).toFixed(1)} km`
      }

      // Format duration
      let durationText: string
      const hours = Math.floor(durationSeconds / 3600)
      const minutes = Math.floor((durationSeconds % 3600) / 60)
      if (hours > 0) {
        durationText = `${hours}h ${minutes}min`
      } else {
        durationText = `${minutes}min`
      }

      setDistance(distanceText)
      setDuration(durationText)
      setLoading(false)
    } catch (err) {
      setLoading(false)
      setError('An error occurred while calculating the route. Please try again.')
      console.error('Route calculation error:', err)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    calculateRoute()
  }

  const clearRoute = () => {
    setOrigin('')
    setDestination('')
    setDistance(null)
    setDuration(null)
    setError(null)
    
    // Clear markers and route
    markersRef.current.forEach(marker => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(marker)
      }
    })
    markersRef.current = []
    
    if (routeLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(routeLayerRef.current)
      routeLayerRef.current = null
    }
    
    // Reset map view to Switzerland
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([46.8182, 8.2275], 7)
    }
  }

  return (
    <div className="w-full">
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mb-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label 
              htmlFor="origin" 
              className="block text-sm font-medium mb-2"
              style={{ color: '#374151' }}
            >
              From (Origin)
            </label>
            <input
              id="origin"
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g., Zürich, Switzerland"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{
                borderColor: '#D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
              }}
            />
          </div>

          <div>
            <label 
              htmlFor="destination" 
              className="block text-sm font-medium mb-2"
              style={{ color: '#374151' }}
            >
              To (Destination)
            </label>
            <input
              id="destination"
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g., Basel, Switzerland"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{
                borderColor: '#D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
              }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !origin.trim() || !destination.trim()}
            className="px-6 py-2 rounded-lg font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{
              backgroundColor: '#2D5016',
              color: '#FFFFFF',
            }}
          >
            {loading ? 'Calculating...' : 'Calculate Route'}
          </button>

          {(distance || error) && (
            <button
              type="button"
              onClick={clearRoute}
              className="px-6 py-2 rounded-lg font-medium transition-opacity hover:opacity-90 border"
              style={{
                borderColor: '#D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Distance and Duration Display */}
      {(distance || duration) && (
        <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium" style={{ color: '#6B7280' }}>Distance: </span>
              <span className="text-lg font-bold" style={{ color: '#2D5016' }}>{distance}</span>
            </div>
            <div>
              <span className="text-sm font-medium" style={{ color: '#6B7280' }}>Duration: </span>
              <span className="text-lg font-bold" style={{ color: '#2D5016' }}>{duration}</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5' }}>
          <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>
        </div>
      )}

      {/* Map Container - Leaflet */}
      <div
        ref={mapRef}
        className="w-full rounded-lg"
        style={{
          height: '500px',
          border: '1px solid #E5E7EB',
          zIndex: 0,
        }}
      />

      {/* Map Attribution */}
      <div className="mt-2 text-xs text-center" style={{ color: '#6B7280' }}>
        {origin && destination ? (
          <a
            href={`https://www.openstreetmap.org/directions?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(destination)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View on OpenStreetMap
          </a>
        ) : (
          <span>© OpenStreetMap contributors</span>
        )}
      </div>
    </div>
  )
}

