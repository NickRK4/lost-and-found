'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Profile() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {


    const fetchProfile = async () => {
      setIsLoading(true)
      const userId = localStorage.getItem('user_id')
      if (!userId) {
        setIsLoading(false)
        return
      }

      try {
        const { data: profile } = await supabase
          .from('users')
          .select('username')
          .eq('id', userId)
          .single()

        if (profile) {
          setUsername(profile.username)
          setNewUsername(profile.username)
        }
      } catch (error) {
        console.error('Error fetching profile:', error as any)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [])


  const updateUsername = async () => {
    if (newUsername === username) return
  
    setIsLoading(true)
    setError('')
  
    try {
      const userId = localStorage.getItem('user_id')
      if (!userId) {
        throw new Error('User not authenticated')
      }
  
      // First check if user exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single()
  
      if (fetchError) throw fetchError
      if (!existingUser) throw new Error('User not found')
  
      // Update username
      const { data, error: updateError } = await supabase
        .from('users')
        .update({ username: newUsername })
        .eq('id', userId)
        .select()
  
      if (updateError) throw updateError
  
      if (!data || data.length === 0) {
        return;
      }
  
      setUsername(newUsername)
      setNewUsername(newUsername)
      setError('')
    } catch (error) {
      console.error('Error updating username:', error)
      setError((error as Error).message || 'Failed to update username')
    } finally {
      setIsLoading(false)
    }
  }

  const updatePassword = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      setError('Failed to update password')
    } else {
      setPassword('')
      setConfirmPassword('')
    }

    setIsLoading(false)
  }

  const deleteAccount = async () => {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth')
      return
    }

    // Delete user's posts
    await supabase
      .from('posts')
      .delete()
      .eq('user_id', user.id)

    // Delete user's messages
    await supabase
      .from('messages')
      .delete()
      .eq('user_id', user.id)

    // Delete user's chats
    await supabase
      .from('chats')
      .delete()
      .or(`creator_id.eq.${user.id},claimer_id.eq.${user.id}`)

    // Delete user's profile
    await supabase
      .from('users')
      .delete()
      .eq('id', user.id)

    // Delete auth user
    await supabase.auth.admin.deleteUser(user.id)

    // Sign out
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Username Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <button
              onClick={updateUsername}
              disabled={isLoading || newUsername === username}
              className="mt-2 w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              Update Username
            </button>
          </div>

          {/* Password Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <label className="block text-sm font-medium text-gray-700 mt-4">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <button
              onClick={updatePassword}
              disabled={isLoading || !password || !confirmPassword}
              className="mt-2 w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              Update Password
            </button>
          </div>

          {/* Delete Account Section */}
          <div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600"
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
