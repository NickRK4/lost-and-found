'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Profile() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsLoading(true)
      try {
        // Get the current user from Supabase Auth
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          // If no user is found, redirect to auth page
          router.push('/auth')
          return
        }
        
        setUserId(user.id)
        setEmail(user.email || '')
        
        // Check if user has a profile in the users table
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single()
        
        if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116 is the error code for "no rows found"
          console.error('Error fetching profile:', profileError)
          setError('Failed to load profile')
        }
        
        if (profile) {
          // If profile exists, set the username
          setUsername(profile.username || '')
          setNewUsername(profile.username || '')
        } else {
          // If no profile exists, create one with default username from email
          const defaultUsername = user.email ? user.email.split('@')[0] : `user_${Date.now()}`
          
          const { error: createError } = await supabase
            .from('users')
            .insert([{ 
              id: user.id,
              username: defaultUsername,
              email: user.email
            }])
          
          if (createError) {
            console.error('Error creating profile:', createError)
            setError('Failed to create profile')
          } else {
            setUsername(defaultUsername)
            setNewUsername(defaultUsername)
          }
        }
      } catch (error: any) {
        console.error('Error in profile setup:', error.message)
        setError('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserProfile()
  }, [router])

  const updateUsername = async () => {
    if (newUsername === username) return
    
    setIsLoading(true)
    setError('')
    setSuccess('')
  
    try {
      if (!userId) {
        throw new Error('User not authenticated')
      }
  
      // Update username
      const { error: updateError } = await supabase
        .from('users')
        .update({ username: newUsername })
        .eq('id', userId)
  
      if (updateError) throw updateError
  
      setUsername(newUsername)
      setSuccess('Username updated successfully')
    } catch (error: any) {
      console.error('Error updating username:', error.message)
      setError(error.message || 'Failed to update username')
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      router.push('/auth')
    } catch (error: any) {
      console.error('Error signing out:', error.message)
      setError('Failed to sign out')
      setIsLoading(false)
    }
  }

  const deleteAccount = async () => {
    setIsLoading(true)
    try {
      if (!userId) {
        throw new Error('User not authenticated')
      }

      // Delete user's posts
      await supabase
        .from('posts')
        .delete()
        .eq('user_id', userId)

      // Delete user's messages
      await supabase
        .from('messages')
        .delete()
        .eq('user_id', userId)

      // Delete user's chats
      await supabase
        .from('chats')
        .delete()
        .or(`creator_id.eq.${userId},claimer_id.eq.${userId}`)

      // Delete user's profile
      await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      // Sign out
      await supabase.auth.signOut()
      router.push('/auth')
    } catch (error: any) {
      console.error('Error deleting account:', error.message)
      setError('Failed to delete account')
      setIsLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
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
        <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* Email Section (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Email (Google Account)</label>
            <input
              type="text"
              value={email}
              disabled
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-[#861397] focus:ring-[#861397] cursor-not-allowed"
            />
            <p className="mt-1 text-sm text-gray-500">
              Your email is managed by Google and cannot be changed here
            </p>
          </div>

          {/* Username Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#861397] focus:ring-[#861397]"
            />
            <button
              onClick={updateUsername}
              disabled={isLoading || newUsername === username || !newUsername.trim()}
              className="mt-2 w-full bg-[#861397] text-white py-2 px-4 rounded-md hover:bg-opacity-90 disabled:opacity-50"
            >
              Update Username
            </button>
          </div>

          {/* Sign Out Button */}
          <div>
            <button
              onClick={signOut}
              disabled={isLoading}
              className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Sign Out
            </button>
          </div>

          {/* Delete Account Section */}
          <div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isLoading}
              className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 disabled:opacity-50"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium mb-4">Are you sure?</h3>
            <p className="text-gray-500 mb-4">
              This action cannot be undone. All your posts and messages will be permanently deleted.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
              >
                Go Back
              </button>
              <button
                onClick={deleteAccount}
                disabled={isLoading}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 disabled:opacity-50"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
