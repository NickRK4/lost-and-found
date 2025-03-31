'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Profile() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
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
          .select('first_name, last_name')
          .eq('id', user.id)
          .single()
        
        if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116 is the error code for "no rows found"
          console.error('Error fetching profile:', profileError)
          setError('Failed to load profile')
        }
        
        if (profile) {
          // If profile exists, set the first and last name
          setFirstName(profile.first_name || '')
          setLastName(profile.last_name || '')
        } else {
          // If no profile exists, create one with names from email
          const emailPrefix = user.email ? user.email.split('@')[0] : '';
          // Try to extract first and last name from email prefix (e.g., john.doe@example.com)
          let defaultFirstName = '';
          let defaultLastName = '';
          
          if (emailPrefix.includes('.')) {
            const nameParts = emailPrefix.split('.');
            defaultFirstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);
            defaultLastName = nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1);
          } else {
            // If no dot in email, use the whole prefix as first name
            defaultFirstName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
          }
          
          // First check if a user with this email already exists
          const { data: existingUser, error: existingUserError } = await supabase
            .from('users')
            .select('id')
            .eq('email', user.email)
            .maybeSingle()
          
          if (existingUserError && existingUserError.code !== 'PGRST116') {
            console.error('Error checking existing user:', existingUserError)
            setError('Failed to check existing profile: ' + existingUserError.message)
            return
          }
          
          let profileError = null
          
          if (existingUser) {
            // If user with this email exists, update it with the current auth user's ID
            const { error: updateError } = await supabase
              .from('users')
              .update({ 
                id: user.id,
                first_name: defaultFirstName,
                last_name: defaultLastName
              })
              .eq('email', user.email)
            
            profileError = updateError
          } else {
            // If no user with this email exists, create a new one
            const { error: createError } = await supabase
              .from('users')
              .insert([{ 
                id: user.id,
                email: user.email,
                first_name: defaultFirstName,
                last_name: defaultLastName
              }])
            
            profileError = createError
          }
          
          if (profileError) {
            console.error('Error creating/updating profile:', profileError)
            setError('Failed to create profile: ' + profileError.message)
          } else {
            setFirstName(defaultFirstName)
            setLastName(defaultLastName)
            setSuccess('Profile created successfully!')
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
          </div>

          {/* First Name Section (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input
              type="text"
              value={firstName}
              disabled
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-[#861397] focus:ring-[#861397] cursor-not-allowed"
            />
          </div>

          {/* Last Name Section (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <input
              type="text"
              value={lastName}
              disabled
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-[#861397] focus:ring-[#861397] cursor-not-allowed"
            />
          </div>

          {/* Sign Out Button */}
          <div>
            <button
              onClick={signOut}
              disabled={isLoading}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Sign Out
            </button>
          </div>
          
          {/* Delete Account Button */}
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
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
          
          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-semibold mb-4">Delete Account</h3>
              <p className="mb-6">
                Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your posts and messages.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-md text-gray-700 border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-md text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                >
                  {isLoading ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
