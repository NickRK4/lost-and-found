'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NewPost() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

      // Create post
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          title,
          description,
          location,
          image_url: publicUrl,
          status: 'active'
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
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">Post Lost/Found Item</h2>
        
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

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              type="text"
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
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
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {loading ? 'Posting...' : 'Post Item'}
          </button>
        </form>
      </div>
    </div>
  )
}
