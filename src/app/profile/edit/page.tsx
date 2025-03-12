'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function EditProfile() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [profilePicture, setProfilePicture] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true)
      
      const userId = localStorage.getItem('user_id')
      if (!userId) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) throw error

        if (data) {
          setUsername(data.username)
          setPreviewUrl(data.avatar_url)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfilePicture(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const userId = localStorage.getItem('user_id')
      if (!userId) throw new Error('User not authenticated')

      let avatarUrl = previewUrl
      if (profilePicture) {
        const fileExt = profilePicture.name.split('.').pop()
        const fileName = `${userId}-${Math.random()}.${fileExt}`
        const { error: uploadError, data } = await supabase.storage
          .from('avatars')
          .upload(fileName, profilePicture)

        if (uploadError) throw uploadError
        avatarUrl = data.path
      }

      const updates = {
        username,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      }

      if (password) {
        const { error: authError } = await supabase.auth.updateUser({
          password: password
        })
        if (authError) throw authError
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)

      if (error) throw error

    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error updating profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="edit-profile-container p-6">
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
      <h1 className="text-3xl font-bold mb-8">Edit Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-32 h-32 mb-4">
            <Image
              src={previewUrl || '/default-avatar.png'}
              alt="Profile"
              fill
              className="rounded-full object-cover"
            />
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            id="profile-picture"
          />
          <label
            htmlFor="profile-picture"
            className="bg-[#57068B] text-white px-4 py-2 rounded-md cursor-pointer hover:bg-[#6A0BA7]"
          >
            Change Profile Picture
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Password (leave blank to keep current)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div className="flex justify-between space-x-4">
          <button 
            type="submit" 
            disabled={loading}
            className="bg-[#57068B] text-white px-6 py-2 rounded-lg hover:bg-[#6A0BA7] disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
