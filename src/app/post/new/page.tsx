'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic';

// Dynamically import the MapComponent
const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });

export default function NewPost() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [coordinates, setCoordinates] = useState<[number, number]>([51.505, -0.09])
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ display_name: string; lat: number; lon: number }>>([])  
  const [locationDebounceTimeout, setLocationDebounceTimeout] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const fetchLocationSuggestions = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
        );
        const data = await response.json();
        setLocationSuggestions(data.map((item: any) => ({
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon)
        })));
      } catch (error) {
        console.error('Error fetching location suggestions:', error);
      }
    };

    // Clear existing timeout
    if (locationDebounceTimeout) {
      clearTimeout(locationDebounceTimeout);
    }

    // Set new timeout
    if (location) {
      const timeout = setTimeout(fetchLocationSuggestions, 500);
      setLocationDebounceTimeout(timeout);
    } else {
      setLocationSuggestions([]);
    }

    // Cleanup
    return () => {
      if (locationDebounceTimeout) {
        clearTimeout(locationDebounceTimeout);
      }
    };
  }, [location])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const userId = localStorage.getItem('user_id')
      if (!userId) {
        router.push('/auth')
        return
      }

      if (!image) {
        throw new Error('Please select an image')
      }

      // Upload image
      const fileExt = image.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      console.log('Uploading image...', {
        bucket: 'post-images',
        filePath,
        fileType: image.type
      })

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('post-images')
        .upload(filePath, image, {
          cacheControl: '3600',
          upsert: false,
          contentType: image.type
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error('Failed to upload image')
      }

      console.log('Upload successful:', uploadData)

      // Get image URL
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath)

      console.log('Public URL:', publicUrl)

      // Create post with coordinates
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          title,
          description,
          location,
          image_url: publicUrl,
          status: 'active',
          latitude: coordinates[0] || null,
          longitude: coordinates[1] || null
        })

      if (postError) {
        console.error('Post error:', postError)
        throw new Error('Failed to create post')
      }

      // Redirect to home page
      router.push('/')
    } catch (error: any) {
      console.error('Full error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mb-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L4.414 9H17a1 1 0 110 2H4.414l5.293 5.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back
        </button>
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Post Lost/Found Item</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              type="text"
              id="location"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
              }}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Type to search for locations..."
            />
            {locationSuggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-60 overflow-auto border border-gray-200">
                {locationSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                    onClick={() => {
                      setLocation(suggestion.display_name);
                      setCoordinates([suggestion.lat, suggestion.lon]);
                      setLocationSuggestions([]);
                    }}
                  >
                    {suggestion.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="map" className="block text-sm font-medium text-gray-700">
              Map Location
            </label>
            <MapComponent
              coordinates={coordinates}
              setCoordinates={setCoordinates}
              address={location}
              setAddress={setLocation}
              interactive={true}
            />
          </div>

          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700">
              Image
            </label>
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              required
              className="mt-1 block w-full"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#550688] hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#550688]"
          >
            {loading ? 'Posting...' : 'Post Item'}
          </button>
        </form>
      </div>
    </div>
  )
}
