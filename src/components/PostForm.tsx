'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import { getSafeSupabaseClient, isClient } from '@/lib/supabaseHelpers'
import toast from 'react-hot-toast'

export default function PostForm() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Get the current user ID on component mount
  useEffect(() => {
    if (isClient()) {
      const currentUserId = localStorage.getItem('user_id')
      setUserId(currentUserId)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    if (!imageUrl) {
      toast.error('Please upload an image')
      return
    }

    if (!userId) {
      toast.error('You must be logged in to create a post')
      return
    }

    try {
      const supabase = getSafeSupabaseClient();
      if (!supabase) {
        toast.error('Unable to initialize Supabase client')
        return
      }
    
      const { error } = await supabase.from('posts').insert({
        description: formData.get('description'),
        location: formData.get('location'),
        image_url: imageUrl,
        user_id: userId,
      })

      if (error) throw error

      toast.success('Post created successfully!')
      
      // Ensure redirection to dashboard
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 100)
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error('Failed to create post')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      const file = e.target.files?.[0]
      if (!file) return

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size too large. Maximum size is 5MB')
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are allowed')
        return
      }

      const supabase = getSafeSupabaseClient();
      if (!supabase) {
        toast.error('Unable to initialize Supabase client')
        return
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('lost-and-found-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(uploadError.message)
      }

      const { data: { publicUrl } } = supabase.storage
        .from('lost-and-found-images')
        .getPublicUrl(filePath)

      setImageUrl(publicUrl)
      toast.success('Image uploaded successfully!')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Upload Image
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                <span>Upload a file</span>
                <input
                  type="file"
                  className="sr-only"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            {uploading && <p className="text-sm text-gray-500">Uploading...</p>}
            {imageUrl && (
              <p className="text-sm text-green-500">Image uploaded successfully!</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Describe the item you lost or found..."
          required
        />
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
          Location
        </label>
        <input
          type="text"
          id="location"
          name="location"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Where was it lost/found?"
          required
        />
      </div>

      <button
        type="submit"
        disabled={uploading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        Create Post
      </button>
    </form>
  )
}
