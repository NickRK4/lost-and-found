'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import ChatList from './ChatList'

export default function Navbar() {
  const [darkMode, setDarkMode] = useState(false)
  const router = useRouter()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark')
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    }
  }, [])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    const newTheme = !darkMode ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', !darkMode)
    localStorage.setItem('theme', newTheme)
  }

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (showProfileMenu && target && !target.closest('.profile-menu')) {
      setShowProfileMenu(false)
    }
  }

  useEffect(() => {
    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showProfileMenu])

  return (
    <nav className="border-b bg-white dark:bg-gray-800">
      <style jsx>{`
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <button
          onClick={() => setShowChatMenu(!showChatMenu)}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-24">
            <div className="flex items-center cursor-pointer" onClick={() => router.push('/')}>
              <div className="w-[100px] h-[60px] relative">
                <Image
                  src="/new-york-university-logo.png"
                  alt="NYU Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div
                className="text-4xl font-bold text-[#5C2E88] hover:opacity-80 transition-opacity ml-6"
              >
                Lost & Found
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/post/new')}
            className="px-4 py-2 rounded-md hover:bg-opacity-80"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            Post Item
          </button>
          <button
            onClick={toggleDarkMode}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center justify-center"
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>
          <div className="relative ml-4 flex items-center">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowProfileMenu(!showProfileMenu)
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50 profile-menu" onClick={(e) => e.stopPropagation()}>
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowProfileMenu(false)
                    router.push('/profile')
                  }}
                >
                  Edit Profile
                </Link>
                <button
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    // await supabase.auth.signOut()
                    // localStorage.removeItem('user_id')
                    router.push('/auth')
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Menu */}
      {showChatMenu && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowChatMenu(false)} />
          <div className="fixed inset-y-0 left-0 max-w-md w-full bg-white shadow-xl">
            <div className="h-full flex flex-col py-6 bg-white shadow-xl">
              <div className="px-4 sm:px-6 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Messages</h2>
                <button
                  onClick={() => setShowChatMenu(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close panel</span>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-6 relative flex-1 px-4 sm:px-6 overflow-y-auto">
                <ChatList onClose={() => setShowChatMenu(false)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
