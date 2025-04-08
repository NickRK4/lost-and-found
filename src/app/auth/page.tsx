'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AuthPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      // Get the current origin with a fallback for local development
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/callback` 
        : 'http://localhost:3000/auth/callback';
        
      console.log('Redirecting to:', redirectUrl);
      
      const { error, data } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      
      if (error) throw error
      
      console.log('Sign-in initiated successfully', data);
    } catch (error: unknown) {
      console.error('Error signing in with Google:', error);
      setError(error instanceof Error ? error.message : 'Error signing in with Google')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Logo Only Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-2xl font-bold text-[#57068B]">
                  Lost&Found
                </Link>
              </div>
            </div>
            {/* Navigation Menu */}
            <div className="flex items-center">
              <nav className="flex space-x-8">
                <Link 
                  href="/" 
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
                >
                  Home
                </Link>
                <Link 
                  href="/about" 
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
                >
                  About
                </Link>
                <Link 
                  href="/auth" 
                  className="border-b-2 border-[#57068B] text-[#57068B] px-3 py-2 text-sm font-medium"
                >
                  Sign Up
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Use your Google account to sign in securely
            </p>
          </div>
        
          {/* Google Sign In Button */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#57068B]"
            >
              <span className="flex items-center">
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                    <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                  </g>
                </svg>
                Sign in with Google
              </span>
            </button>
          </div>

          {error && (
            <div className="text-sm text-center text-red-500">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
