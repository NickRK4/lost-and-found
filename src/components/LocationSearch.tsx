'use client'

import { useState, useEffect, useRef } from 'react'
import debounce from 'lodash/debounce'

interface LocationSearchProps {
  onLocationSelect: (location: { address: string; coordinates: [number, number] }) => void
  initialLocation?: string
}

interface Suggestion {
  display_name: string
  place_id: string
  lat: string
  lon: string
}

export default function LocationSearch({ onLocationSelect, initialLocation = '' }: LocationSearchProps) {
  const [query, setQuery] = useState(initialLocation)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchLocation = useRef(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setSuggestions([])
        return
      }

      setLoading(true)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
        )
        const data = await response.json()
        setSuggestions(data.slice(0, 5)) // Limit to 5 suggestions
      } catch (error) {
        console.error('Error fetching locations:', error)
      } finally {
        setLoading(false)
      }
    }, 300)
  ).current

  const handleSelect = (suggestion: Suggestion) => {
    const address = suggestion.display_name
    const coordinates: [number, number] = [
      parseFloat(suggestion.lat),
      parseFloat(suggestion.lon)
    ]
    setQuery(address)
    onLocationSelect({ address, coordinates })
    setShowSuggestions(false)
  }

  const handleGetCurrentLocation = () => {
    if ("geolocation" in navigator) {
      setLoading(true)
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          try {
            // Reverse geocode the coordinates to get the address
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            )
            const data = await response.json()
            setQuery(data.display_name)
            onLocationSelect({
              address: data.display_name,
              coordinates: [latitude, longitude]
            })
          } catch (error) {
            console.error('Error reverse geocoding:', error)
          } finally {
            setLoading(false)
          }
        },
        (error) => {
          console.error('Geolocation error:', error)
          setLoading(false)
        }
      )
    }
  }

  return (
    <div ref={wrapperRef} className="relative space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            searchLocation(e.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search for a location..."
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-var(--primary) dark:bg-gray-700 dark:text-white"
        />
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          className="px-3 py-2 bg-var(--primary) text-var(--primary-foreground) rounded-lg hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-var(--primary)"
        >
          Add Location
        </button>
      </div>
      
      {showSuggestions && (suggestions.length > 0 || loading) && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-32 overflow-y-auto">
          {loading ? (
            <div className="p-2 text-gray-500 dark:text-gray-400 text-sm">Loading...</div>
          ) : (
            suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.place_id}-${index}`}
                onClick={() => handleSelect(suggestion)}
                className="w-full text-left px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 truncate"
              >
                {suggestion.display_name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
