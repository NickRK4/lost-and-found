'use client'

import { useEffect, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'

// Fix Leaflet icon issues
const fixLeafletIcon = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  })
}

interface MapComponentProps {
  coordinates: [number, number]
  setCoordinates: (coordinates: [number, number]) => void
  address: string
  setAddress: (address: string) => void
  interactive?: boolean
}

function MapComponent({
  coordinates,
  setCoordinates,
  address,
  setAddress,
  interactive = true
}: MapComponentProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    fixLeafletIcon()
  }, [])

  const handleGetCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates([latitude, longitude]);

          try {
            // Reverse geocode the coordinates to get the address
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            setAddress(data.display_name);
          } catch (error) {
            console.error('Error reverse geocoding:', error);
          }
        },
        (error) => {
          console.error('Geolocation error:', error.message);
          alert('Unable to retrieve your location. Please ensure location services are enabled.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  }

  if (!isClient) {
    return <div className="h-64 bg-gray-200 animate-pulse rounded-lg"></div>
  }

  return (
    <div className="space-y-2">
      {interactive && (
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          className="px-3 py-2 bg-[#550688] text-white rounded-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-[#550688] focus:ring-opacity-50"
        >
          Get My Location
        </button>
      )}
      
      <div className="h-64 rounded-lg overflow-hidden">
        <MapContainer
          center={coordinates}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={coordinates}>
            <Popup>{address}</Popup>
          </Marker>
          <MapCenter coordinates={coordinates} setCoordinates={setCoordinates} setAddress={setAddress} interactive={interactive} />
        </MapContainer>
      </div>
    </div>
  )
}

function MapCenter({ coordinates, setCoordinates, setAddress, interactive }: { coordinates: [number, number], setCoordinates: (coordinates: [number, number]) => void, setAddress: (address: string) => void, interactive: boolean }) {
  const map = useMapEvents({
    click: async (e) => {
      if (!interactive) return;

      const { lat, lng } = e.latlng;
      setCoordinates([lat, lng]);

      try {
        // Reverse geocode the coordinates to get the address
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        setAddress(data.display_name);
      } catch (error) {
        console.error('Error reverse geocoding:', error);
      }
    },
  });

  useEffect(() => {
    map.setView(coordinates, map.getZoom());
  }, [coordinates, map]);

  return null;
}

export default MapComponent