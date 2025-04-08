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
          // Session exists, get user data and store first/last name
          console.log('Session exists, storing user data and redirecting to main feed')
          
          const { data: userData, error: userError } = await supabase.auth.getUser()
          
          if (userError) {
            console.error('Error getting user data:', userError.message)
          } else if (userData && userData.user) {
            // Extract first and last name from user metadata or email
            const user = userData.user
            let firstName = ''
            let lastName = ''
            
            // Try to get names from user metadata (provided by Google)
            if (user.user_metadata) {
              firstName = user.user_metadata.given_name || user.user_metadata.first_name || ''
              lastName = user.user_metadata.family_name || user.user_metadata.last_name || ''
              
              // If names not found in metadata, try to extract from full_name
              if ((!firstName || !lastName) && user.user_metadata.full_name) {
                const nameParts = user.user_metadata.full_name.split(' ')
                if (nameParts.length >= 2) {
                  firstName = nameParts[0] || ''
                  lastName = nameParts.slice(1).join(' ') || ''
                } else if (nameParts.length === 1) {
                  firstName = nameParts[0] || ''
                }
              }
            }
            
            // If still no names, try to use email as fallback
            if ((!firstName || !lastName) && user.email) {
              firstName = user.email.split('@')[0] || ''
            }
            
            // Check if user already exists in the users table
            const { data: existingUser, error: checkError } = await supabase
              .from('users')
              .select('id, first_name, last_name')
              .eq('id', user.id)
              .single()
              
            if (checkError && checkError.code !== 'PGRST116') { // Not found error is expected
              console.error('Error checking for existing user:', checkError.message)
            }
            
            if (existingUser) {
              // User exists, update first and last name if they're not already set
              if (!existingUser.first_name || !existingUser.last_name) {
                const { error: updateError } = await supabase
                  .from('users')
                  .update({ 
                    first_name: firstName || existingUser.first_name || '',
                    last_name: lastName || existingUser.last_name || ''
                  })
                  .eq('id', user.id)
                  
                if (updateError) {
                  console.error('Error updating user names:', updateError.message)
                }
              }
            } else {
              // User doesn't exist, create a new profile with names
              const { error: createError } = await supabase
                .from('users')
                .insert([{ 
                  id: user.id,
                  user_id: user.id,
                  email: user.email,
                  first_name: firstName,
                  last_name: lastName
                }])
                
              if (createError) {
                console.error('Error creating user profile:', createError.message)
              }
            }
          }
          
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
            
            // Get user data after exchanging code
            const { data: userData, error: userError } = await supabase.auth.getUser()
            
            if (userError) {
              console.error('Error getting user data after code exchange:', userError.message)
            } else if (userData && userData.user) {
              // Extract first and last name from user metadata or email
              const user = userData.user
              let firstName = ''
              let lastName = ''
              
              // Try to get names from user metadata (provided by Google)
              if (user.user_metadata) {
                firstName = user.user_metadata.given_name || user.user_metadata.first_name || ''
                lastName = user.user_metadata.family_name || user.user_metadata.last_name || ''
                
                // If names not found in metadata, try to extract from full_name
                if ((!firstName || !lastName) && user.user_metadata.full_name) {
                  const nameParts = user.user_metadata.full_name.split(' ')
                  if (nameParts.length >= 2) {
                    firstName = nameParts[0] || ''
                    lastName = nameParts.slice(1).join(' ') || ''
                  } else if (nameParts.length === 1) {
                    firstName = nameParts[0] || ''
                  }
                }
              }
              
              // If still no names, try to use email as fallback
              if ((!firstName || !lastName) && user.email) {
                firstName = user.email.split('@')[0] || ''
              }
              
              // Check if user already exists in the users table
              const { data: existingUser, error: checkError } = await supabase
                .from('users')
                .select('id, first_name, last_name')
                .eq('id', user.id)
                .single()
                
              if (checkError && checkError.code !== 'PGRST116') { // Not found error is expected
                console.error('Error checking for existing user:', checkError.message)
              }
              
              if (existingUser) {
                // User exists, update first and last name if they're not already set
                if (!existingUser.first_name || !existingUser.last_name) {
                  const { error: updateError } = await supabase
                    .from('users')
                    .update({ 
                      first_name: firstName || existingUser.first_name || '',
                      last_name: lastName || existingUser.last_name || ''
                    })
                    .eq('id', user.id)
                    
                  if (updateError) {
                    console.error('Error updating user names:', updateError.message)
                  }
                }
              } else {
                // User doesn't exist, create a new profile with names
                const { error: createError } = await supabase
                  .from('users')
                  .insert([{ 
                    id: user.id,
                    user_id: user.id,
                    email: user.email,
                    first_name: firstName,
                    last_name: lastName
                  }])
                  
                if (createError) {
                  console.error('Error creating user profile:', createError.message)
                }
              }
            }
            
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
  }, [router, supabase, supabase.auth])
  
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
