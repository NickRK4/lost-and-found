'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import ChatList from './ChatList'
import { supabase } from '@/lib/supabase'

export default function Navbar() {
  const router = useRouter()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState(false)
  const [notifications, setNotifications] = useState<number>(0)
  const [notificationsViewed, setNotificationsViewed] = useState(false)

  useEffect(() => {
    // Get current user ID from localStorage
    const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
    
    if (userId) {
      fetchNotifications(userId)
      
      // Set up subscription for real-time updates
      const subscription = supabase
        .channel('claim_notifications')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'claim_questionnaire'
        }, () => {
          fetchNotifications(userId)
          // Reset the viewed status when new notifications arrive
          setNotificationsViewed(false)
        })
        .subscribe()
      
      return () => {
        subscription.unsubscribe()
      }
    }
  }, [])

  const fetchNotifications = async (userId: string) => {
    if (!userId) return
    
    try {
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
          
          if (!claimsError) {
            count = claimsCount || 0
          }
        } else {
          count = questionnaireCount || 0
        }
      } catch (countError) {
        console.error('Error counting notifications:', countError)
      }
      
      setNotifications(count)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setNotifications(0)
    }
  }

  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (showProfileMenu && target && !target.closest('.profile-menu')) {
      setShowProfileMenu(false)
    }
    
    // Close chat menu when clicking outside
    if (showChatMenu && target && !target.closest('.chat-sidebar') && !target.closest('.chat-menu-button')) {
      setShowChatMenu(false)
    }
  }, [showProfileMenu, showChatMenu]);

  useEffect(() => {
    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
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
                setNotificationsViewed(true);
                router.push('/claims');
              }}
              className="text-gray-500 hover:text-gray-700 relative flex items-center justify-center h-full"
              aria-label="View claim requests"
            >
              <svg 
                className={`h-6 w-6 ${notifications > 0 ? 'text-[#57068B]' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
                />
              </svg>
              {notifications > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 bg-[#57068B] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications}
                  </span>
                  {!notificationsViewed && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-[#57068B] opacity-75"></span>
                  )}
                </>
              )}
            </button>
          </div>
          
          <div className="relative flex items-center h-10">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowProfileMenu(!showProfileMenu)
              }}
              className="text-gray-500 hover:text-gray-700 flex items-center justify-center h-full"
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
