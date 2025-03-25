'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  
  useEffect(() => {
    const handleAuthCallback = async () => {
      const code = searchParams.get('code')
      
      if (code) {
        // Exchange the code for a session
        await supabase.auth.exchangeCodeForSession(code)
        
        // Get user info
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Store user info in localStorage
          localStorage.setItem('user_id', user.id)
          
          // Redirect to home page
          router.push('/')
        } else {
          // If no user, redirect to auth page
          router.push('/auth')
        }
      } else {
        // If no code, redirect to auth page
        router.push('/auth')
      }
    }
    
    handleAuthCallback()
  }, [router, searchParams, supabase.auth])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-200">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#57068B] mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white transition-colors duration-200">Completing authentication...</h2>
        <p className="text-gray-500 dark:text-gray-300 transition-colors duration-200">Please wait while we redirect you.</p>
      </div>
    </div>
  )
}
