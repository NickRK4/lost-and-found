'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSafeSupabaseClient, isClient } from '@/lib/supabaseHelpers'
import Image from 'next/image'
import { Bell } from 'lucide-react'
import ChatList from './ChatList'

export default function Navbar() {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [, setUser] = useState<{id: string; email?: string; first_name?: string; last_name?: string} | null>(null)
  const [notifications, setNotifications] = useState(0)
  const [showChatMenu, setShowChatMenu] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    // Only check for userId on client side
    if (!isClient()) return
    
    const userId = localStorage.getItem('user_id')
    if (!userId) {
      router.push('/auth')
      return
    }
    
    // Fetch user details
    const fetchUserDetails = async () => {
      try {
        const supabase = getSafeSupabaseClient()
        const { data, error } = await supabase
          .from('users')
          .select('id, email, first_name, last_name')
          .eq('id', userId)
          .single()
        
        if (error) throw error
        
        if (data) {
          setUser({
            id: String(data.id),
            email: data.email ? String(data.email) : undefined,
            first_name: data.first_name ? String(data.first_name) : undefined,
            last_name: data.last_name ? String(data.last_name) : undefined
          })
        } else {
          // User data not found, redirect to auth
          localStorage.removeItem('user_id')
          router.push('/auth')
        }
      } catch (error) {
        console.error('Error fetching user details:', error)
      }
    }
    
    fetchUserDetails()
  }, [router])

  // Fetch notifications count (pending claims)
  useEffect(() => {
    if (!isClient()) return
    
    const userId = localStorage.getItem('user_id')
    if (!userId) return
    
    const fetchNotificationsCount = async () => {
      try {
        const supabase = getSafeSupabaseClient()
        // First get all posts by the current user
        const { data: userPosts, error: postsError } = await supabase
          .from('posts')
          .select('id')
          .eq('user_id', userId)
        
        if (postsError) {
          console.error('Error fetching user posts:', postsError)
          return
        }
        
        if (!userPosts || userPosts.length === 0) {
          setNotifications(0)
          return
        }
        
        const postIds = userPosts.map(post => post.id)
        
        // Try to get count of pending claims from claim_questionnaire table
        let count = 0
        
        try {
          // First try the claim_questionnaire table
          const supabase = getSafeSupabaseClient()
          const { error, count: questionnaireCount } = await supabase
            .from('claim_questionnaire')
            .select('id', { count: 'exact' })
            .in('post_id', postIds)
            .eq('status', 'pending')
          
          if (error) {
            console.log('Trying claims table instead:', error.message)
            
            // If there's an error, try the claims table
            const { error: claimsError, count: claimsCount } = await supabase
              .from('claims')
              .select('id', { count: 'exact' })
              .in('post_id', postIds)
              .eq('status', 'pending')
            
            if (claimsError) {
              console.error('Error counting claims:', claimsError)
              return
            }
            
            count = claimsCount || 0
          } else {
            count = questionnaireCount || 0
          }
          
          setNotifications(count)
        } catch (error) {
          console.error('Error fetching notifications:', error)
        }
      } catch (error) {
        console.error('Error in notification system:', error)
      }
    }
    
    fetchNotificationsCount()
    
    // Set up interval to refresh every 30 seconds
    const interval = setInterval(fetchNotificationsCount, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    if (isClient()) {
      localStorage.removeItem('user_id')
      router.push('/auth')
    }
  }
  
  // Handle clicking outside the dropdown to close it
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setDropdownOpen(false)
    }
    
    // Close chat menu when clicking outside
    const target = e.target as HTMLElement;
    if (showChatMenu && target && !target.closest('.chat-sidebar') && !target.closest('.chat-menu-button')) {
      setShowChatMenu(false)
    }
  }, [showChatMenu])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

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
        <div className="flex items-center">
          <button
            onClick={() => router.push('/post/new')}
            className="px-4 py-2 rounded-md hover:bg-opacity-80 h-10 flex items-center"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            Post Item
          </button>
          
          {/* Notification Bell */}
          <div className="relative mx-4 flex items-center h-10">
            <button
              onClick={() => {
                router.push('/claims');
              }}
              className="text-gray-500 hover:text-gray-700 relative flex items-center justify-center h-full"
              aria-label="View claim requests"
            >
              <Bell 
                className={`h-6 w-6 ${notifications > 0 ? 'text-[#57068B]' : ''}`} 
              />
              {notifications > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 bg-[#57068B] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications}
                  </span>
                </>
              )}
            </button>
          </div>
          
          <div className="relative flex items-center h-10">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setDropdownOpen(!dropdownOpen)
              }}
              className="text-gray-500 hover:text-gray-700 flex items-center justify-center h-full"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50" ref={dropdownRef}>
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDropdownOpen(false)
                    router.push('/profile')
                  }}
                >
                  Edit Profile
                </Link>
                <button
                  onClick={handleLogout}
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
