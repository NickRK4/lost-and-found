'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import ChatList from './ChatList'

export default function Navbar() {
  const router = useRouter()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState(false)

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (showProfileMenu && target && !target.closest('.profile-menu')) {
      setShowProfileMenu(false)
    }
    
    // Close chat menu when clicking outside
    if (showChatMenu && target && !target.closest('.chat-sidebar') && !target.closest('.chat-menu-button')) {
      setShowChatMenu(false)
    }
  }

  useEffect(() => {
    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showProfileMenu, showChatMenu])

  return (
    <nav className="border-b bg-white shadow">
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
          onClick={(e) => {
            e.stopPropagation();
            setShowChatMenu(!showChatMenu);
          }}
          className="text-gray-500 hover:text-gray-700 chat-menu-button"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-24">
            <div className="flex items-center cursor-pointer" onClick={() => router.push('/dashboard')}>
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

      {showChatMenu && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex">
          <div className="bg-white dark:bg-gray-800 w-80 h-full overflow-y-auto shadow-lg chat-sidebar">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Messages</h2>
              <button
                onClick={() => setShowChatMenu(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ChatList />
          </div>
        </div>
      )}
    </nav>
  )
}
