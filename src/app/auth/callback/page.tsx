'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if we have a session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error.message)
          router.push('/auth')
          return
        }
        
        if (session) {
          // Session exists, redirect to main feed
          console.log('Session exists, redirecting to main feed')
          router.push('/dashboard')
        } else {
          // No session, try to exchange code for session
          // This is needed for the OAuth callback flow
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const queryParams = new URLSearchParams(window.location.search)
          
          const code = queryParams.get('code')
          const accessToken = hashParams.get('access_token')
          
          if (code) {
            // Exchange code for session
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            
            if (error) {
              console.error('Error exchanging code for session:', error.message)
              router.push('/auth')
              return
            }
            
            console.log('Successfully exchanged code for session')
            router.push('/dashboard')
          } else if (accessToken) {
            // We have an access token in the URL hash
            console.log('Found access token in URL')
            // The session should be automatically set up by Supabase
            router.push('/dashboard')
          } else {
            console.error('No authentication code or token found')
            router.push('/auth')
          }
        }
      } catch (error) {
        console.error('Unexpected error during authentication:', error)
        router.push('/auth')
      }
    }
    
    handleAuthCallback()
  }, [router, supabase.auth])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#57068B] mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2 text-gray-900">Completing authentication...</h2>
        <p className="text-gray-500">Please wait while we redirect you.</p>
      </div>
    </div>
  )
}
