import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          // Store user ID in localStorage for convenience
          localStorage.setItem('user_id', session.user.id)
        } else {
          setUser(null)
          // Don't remove user_id on initial load to prevent logout on refresh
          // Only remove it when explicitly signing out
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          localStorage.setItem('user_id', session.user.id)
        } else if (event === 'SIGNED_OUT') {
          // Only clear user data when explicitly signed out
          setUser(null)
          localStorage.removeItem('user_id')
          
          // Redirect to auth page if not on auth page already
          if (window.location.pathname !== '/auth') {
            router.push('/auth')
          }
        }
      }
    )

    // Cleanup
    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  return {
    user,
    loading,
    isAuthenticated: !!user
  }
}
