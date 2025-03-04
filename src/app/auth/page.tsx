'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const validatePassword = (password: string): string | null => {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter'
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number'
  }
  return null
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    const userId = localStorage.getItem('user_id')
    if (userId) {
      router.push('/')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const cleanUsername = username.toLowerCase().trim()

      if (!isLogin) {
        // For registration
        const passwordError = validatePassword(password)
        if (passwordError) {
          throw new Error(passwordError)
        }

        // Check if username exists
        const { data: existingUser } = await supabase
          .from('users')
          .select()
          .eq('username', cleanUsername)
          .single()

        if (existingUser) {
          throw new Error('Username already taken')
        }

        // Get hashed password
        const { data: hashedPassword, error: hashError } = await supabase
          .rpc('hash_password', { password })

        if (hashError) throw hashError

        // Create user
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([{ 
            username: cleanUsername, 
            password_hash: hashedPassword 
          }])
          .select()
          .single()

        if (createError) throw createError

        setError('Registration successful! Please sign in.')
        setIsLogin(true)
        setPassword('')
      } else {
        // Login
        const { data: userId, error: loginError } = await supabase
          .rpc('verify_password', {
            username: cleanUsername,
            password
          })

        if (loginError || !userId) {
          throw new Error('Invalid username or password')
        }

        localStorage.setItem('user_id', userId)
        localStorage.setItem('username', cleanUsername)
        router.push('/')
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </h2>
          {!isLogin && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Password must contain at least 8 characters, including uppercase, lowercase, and numbers
            </p>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                pattern="[a-zA-Z0-9_]+"
                title="Username can only contain letters, numbers, and underscores"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
              />
            </div>
          </div>

          {error && (
            <div className={`text-sm text-center ${error.includes('successful') ? 'text-green-500' : 'text-red-500'}`}>
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? 'Processing...' : isLogin ? 'Sign in' : 'Sign up'}
            </button>
          </div>

          <div className="text-sm text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
                setPassword('')
              }}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
