/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

// eslint-disable-next-line no-console
console.log("hello world - this is test!");

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import ClaimModal from '@/components/ClaimModal'
import debounce from 'lodash.debounce'
import dynamic from 'next/dynamic'

const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false })

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
  latitude: number
  longitude: number
  claimer_id?: string
  claimer: {username : string} | null
}

export default function Home() {
  const router = useRouter()
  const [timeRange, setTimeRange] = useState<TimeRange>('7days')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([])
  const currentUserId = localStorage.getItem('user_id') || ''
  const postCardRef = useRef<HTMLDivElement>(null)
  const [postCardWidth, setPostCardWidth] = useState<number>(300)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [showMapId, setShowMapId] = useState<string | null>(null)

  useEffect(() => {
    if (postCardRef.current) {
      setPostCardWidth(postCardRef.current.offsetWidth)
    }
  }, [timeRange])

  const fetchPosts = async () => {
    setLoading(true)
    setPosts([]) // Clear posts immediately to avoid showing stale data
    setFilteredPosts([]) // Clear filtered posts as well
    
    try {
      // First, get all posts with basic user info
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          username:users!user_id (username)
        `)
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
            return true
          default:
            return true
        }
      })
      
      // For each post, get claimer info if it exists
      const postsWithClaimers = await Promise.all(
        filteredPosts.map(async (post) => {
          if (post.claimer_id) {
            const { data: claimer } = await supabase
              .from('users')
              .select('username')
              .eq('id', post.claimer_id)
              .single()
            return {
              ...post,
              claimer: claimer || null
            }
          }
          return post
        })
      )
      
      setPosts(postsWithClaimers)
      setFilteredPosts(postsWithClaimers) // Set filtered posts directly after fetching
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    if (!userId) {
      router.push('/auth')
      return
    }

    fetchPosts()
  }, [timeRange])

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
      if (!posts.length) return; // Don't run if posts haven't loaded yet
      
      const searchFiltered = query
        ? posts.filter(post =>
            post.title.toLowerCase().includes(query.toLowerCase()) ||
            post.description.toLowerCase().includes(query.toLowerCase())
          )
        : posts

      setFilteredPosts(searchFiltered)
    }, 300),
    [posts]
  )

  useEffect(() => {
    debouncedSearch(searchQuery)
    return () => {
      debouncedSearch.cancel()
    }
  }, [searchQuery, debouncedSearch, posts])

  const handleImageClick = (imageUrl: string) => {
    setExpandedImage(imageUrl)
  }

  const closeExpandedImage = () => {
    setExpandedImage(null)
  }

  return (
    <div className="min-h-screen transition-colors" style={{ backgroundColor: '#57068B' }}>
      {/* Time Range Filter */}
      <div className="max-w-7xl mx-auto px-4 py-6 mb-5">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                timeRange === '1day' ? 'bg-[#861397] text-white' : 'bg-white text-gray-700 hover:bg-[#861397]/10'
              }`}
              onClick={() => setTimeRange('1day')}
            >
              Last 24 Hours
            </button>
            <button
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                timeRange === '7days' ? 'bg-[#861397] text-white' : 'bg-white text-gray-700 hover:bg-[#861397]/10'
              }`}
              onClick={() => setTimeRange('7days')}
            >
              Last 7 Days
            </button>
            <button
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                timeRange === 'older' ? 'bg-[#861397] text-white' : 'bg-white text-gray-700 hover:bg-[#861397]/10'
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
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#861397] focus:border-[#861397]"
              placeholder="Search for items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex space-x-4">
          {/* Posts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4 w-full justify-items-center">
            {loading ? (
              <div className="col-span-full flex justify-center items-center">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Loading posts...</p>
                </div>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="col-span-full text-center text-white">
                <p>No posts found</p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden w-full"
                  style={{ maxWidth: "300px" }}
                >
                  <div className="relative h-48 w-full">
                    <Image
                      src={post.image_url}
                      alt={post.title}
                      fill
                      className="object-cover"
                      onClick={() => setExpandedImage(post.image_url)}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
                    <div className="flex items-center mb-2">
                      <p className="text-gray-600 flex-grow truncate">{post.location}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();  // Prevent opening the claim modal
                          setShowMapId(showMapId === post.id ? null : post.id);
                        }}
                        className="flex items-center text-[#57068B] hover:text-[#6A0BA7] transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-[#57068B] focus:ring-opacity-50 rounded-md px-3 py-1.5"
                      >
                        <span className="mr-1">{showMapId === post.id ? 'Hide Map' : 'Show Map'}</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-4 w-4 transform transition-transform ${showMapId === post.id ? 'rotate-180' : ''}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    {showMapId === post.id && (
                      <div className="h-48 w-full rounded-lg overflow-hidden border border-gray-200 mb-4">
                        <MapComponent
                          coordinates={[post.latitude, post.longitude]}
                          setCoordinates={() => {}}
                          address={post.location}
                          setAddress={() => {}}
                          interactive={false}
                        />
                      </div>
                    )}
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{post.description}</p>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-gray-500">{post.username}</span>
                      <span className="text-sm text-gray-500">{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                    {post.user_id === currentUserId ? (
                      <button
                        disabled
                        className="w-full px-4 py-2 rounded-md bg-gray-300 cursor-not-allowed"
                      >
                        Your Post
                      </button>
                    ) : post.status === 'claimed' && post.claimer_id === currentUserId ? (
                      <button
                        onClick={() => handleStartChat(post.id, post.user_id)}
                        className="w-full px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-700"
                      >
                        Open Chat
                      </button>
                    ) : post.status === 'claimed' ? (
                      <button
                        disabled
                        className="w-full px-4 py-2 rounded-md bg-gray-300 cursor-not-allowed"
                      >
                        Cannot Claim
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedPost(post)}
                        className="w-full px-4 py-2 rounded-md bg-[#57068B] text-white hover:bg-[#6A0BA7]"
                      >
                        Claim Item
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

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
                  <p className="font-medium truncate">{selectedPost.location}</p>
                </div>
                <p className="text-gray-600 dark:text-gray-300">{selectedPost.description}</p>
                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L4.414 9H17a1 1 0 110 2H4.414l5.293 5.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Back
                  </button>
                  <button
                    onClick={handleClaimItem}
                    disabled={selectedPost.user_id === currentUserId}
                    className="bg-[#57068B] text-white px-6 py-2 rounded-lg hover:bg-[#6A0BA7] disabled:bg-gray-400 transition-colors"
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
