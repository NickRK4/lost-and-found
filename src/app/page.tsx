'use client'

console.log("hello world - this is test!");

import Link from 'next/link'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import ClaimModal from '@/components/ClaimModal'
import ChatList from '@/components/ChatList'
import ChatMessages from '@/components/ChatMessages'
import debounce from 'lodash.debounce'

type TimeRange = '1day' | '7days' | 'older'

interface Post {
  id: string
  title: string
  description: string
  location: string
  image_url: string
  created_at: string
  user_id: string
  username: string
  status: 'active' | 'claimed' | 'resolved'
}

export default function Home() {
  const router = useRouter()
  const [timeRange, setTimeRange] = useState<TimeRange>('7days')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showChatMenu, setShowChatMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [selectedChatId, setSelectedChatId] = useState<string>()
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([])
  const currentUserId = localStorage.getItem('user_id')
  const postCardRef = useRef<HTMLDivElement>(null)
  const [postCardWidth, setPostCardWidth] = useState<number>(300)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  useEffect(() => {
    if (postCardRef.current) {
      setPostCardWidth(postCardRef.current.offsetWidth)
    }
  }, [])

  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    if (!userId) {
      router.push('/auth')
      return
    }

    fetchPosts()
  }, [timeRange])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          username:users!user_id (username)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Fetch error:', error)
        throw error
      }

      // Filter posts based on time range
      const now = new Date()
      const filteredPosts = (data || []).map(post => ({
        ...post,
        username: post.username.username
      })).filter(post => {
        const postDate = new Date(post.created_at)
        const diffDays = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24)
        
        switch (timeRange) {
          case '1day':
            return diffDays <= 1
          case '7days':
            return diffDays <= 7
          case 'older':
            return diffDays > 7
          default:
            return true
        }
      })
      
      setPosts(filteredPosts)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartChat = async (postId: string, creatorId: string) => {
    try {
      // Check if chat already exists
      const { data: existingChat, error: findError } = await supabase
        .from('chats')
        .select('id')
        .eq('post_id', postId)
        .eq('creator_id', creatorId)
        .eq('claimer_id', currentUserId)
        .single()

      if (!findError && existingChat) {
        // Navigate directly to existing chat
        router.push(`/chat/${existingChat.id}`)
        return
      }

      // Create new chat
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          post_id: postId,
          creator_id: creatorId,
          claimer_id: currentUserId
        })
        .select('id')
        .single()

      if (createError) throw createError

      // Navigate to new chat
      if (newChat) {
        router.push(`/chat/${newChat.id}`)
      }
    } catch (error) {
      console.error('Error starting chat:', error)
    }
  }

  const handleClaimItem = async () => {
    if (!selectedPost || !currentUserId) return

    try {
      // Update post status
      const { error: postError } = await supabase
        .from('posts')
        .update({ status: 'claimed' })
        .eq('id', selectedPost.id)

      if (postError) throw postError

      // Start chat
      await handleStartChat(selectedPost.id, selectedPost.user_id)

      // Refresh posts
      fetchPosts()
    } catch (error) {
      console.error('Error claiming item:', error)
    }
  }

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      const fetchPosts = async () => {
        let supabaseQuery = supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })

        if (query) {
          supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        }

        const { data } = await supabaseQuery
        setFilteredPosts(data || [])
      }

      fetchPosts()
    }, 300),
    []
  )

  useEffect(() => {
    debouncedSearch(searchQuery)
    return () => {
      debouncedSearch.cancel()
    }
  }, [searchQuery, debouncedSearch])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (showProfileMenu && target && !target.closest('.profile-menu')) {
        setShowProfileMenu(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showProfileMenu])

  const handleImageClick = (imageUrl: string) => {
    setExpandedImage(imageUrl)
  }

  const closeExpandedImage = () => {
    setExpandedImage(null)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
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
        <div className="flex items-center justify-center h-12">
        <div
            onClick={() => router.push('/')}
            className="text-3xl font-bold bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600 bg-[length:300%_300%] animate-gradient bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
            style={{animation: 'gradient 5s ease infinite'}}
          >
            Lost & Found
          </div>
        </div>
      </div>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/post/new')}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
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
                      //e.preventDefault()
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
                      await supabase.auth.signOut()
                      localStorage.removeItem('user_id')
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
      </header>

      {/* Time Range Filter */}
      <div className="max-w-7xl mx-auto px-4 py-6 mb-5">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                timeRange === '1day' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setTimeRange('1day')}
            >
              Last 24 Hours
            </button>
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                timeRange === '7days' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setTimeRange('7days')}
            >
              Last 7 Days
            </button>
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                timeRange === 'older' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setTimeRange('older')}
            >
              Older
            </button>
          </div>
          <div className="flex-grow"></div>
          <div className="w-64">
            <input
              type="text"
              className="w-full px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search for items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex space-x-4">
          {/* Posts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-5">
            {loading ? (
              <p>Loading...</p>
            ) : filteredPosts.length === 0 ? (
              <p>No posts found</p>
            ) : (
              filteredPosts.map((post) => (
                <div
                  key={post.id}
                  ref={postCardRef}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                  style={{ minWidth: postCardWidth }}
                >
                  <div className="relative h-48">
                    <Image
                      src={post.image_url}
                      alt={post.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
                    <p className="text-gray-600 mb-2">{post.location}</p>
                    <p className="text-gray-500 text-sm mb-4">{post.description}</p>
                    <button
                      onClick={() => setSelectedPost(post)}
                      disabled={post.user_id === currentUserId}
                      className={`w-full px-4 py-2 rounded-md ${
                        post.user_id === currentUserId
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      {post.user_id === currentUserId ? 'Your Post' : 'Claim Item'}
                    </button>
                  </div>
                </div>
              ))
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
                <ChatList />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Claim Modal */}
      {selectedPost && (
        <ClaimModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onClaim={handleClaimItem}
          isOwnPost={selectedPost.user_id === currentUserId}
        >
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50" onClick={() => setSelectedPost(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
              <div className="relative h-96 mb-4 cursor-pointer" onClick={() => handleImageClick(selectedPost.image_url)}>
                <Image
                  src={selectedPost.image_url}
                  alt={selectedPost.title}
                  fill
                  className="object-contain rounded-lg"
                />
              </div>
              <div className="mt-4 space-y-4">
                <h2 className="text-2xl font-bold">{selectedPost.title}</h2>
                <div className="text-gray-600 dark:text-gray-300">
                  <p className="font-medium">Posted by: {selectedPost.username}</p>
                  <p className="font-medium">Location: {selectedPost.location}</p>
                </div>
                <p className="text-gray-600 dark:text-gray-300">{selectedPost.description}</p>
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleClaimItem}
                    disabled={selectedPost.user_id === currentUserId}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
                  >
                    {selectedPost.user_id === currentUserId ? 'Your Post' : 'Start Chat'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ClaimModal>
      )}

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[60]" 
          onClick={closeExpandedImage}
        >
          <div className="max-w-[90vw] max-h-[90vh] relative">
            <Image
              src={expandedImage}
              alt="Expanded view"
              width={1200}
              height={800}
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
