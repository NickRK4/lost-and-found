'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import ClaimModal from '@/components/ClaimModal'
import debounce from 'lodash.debounce'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import ClaimQuestionnaire from '@/components/ClaimQuestionnaire'

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
  first_name: string
  last_name: string
  status: 'active' | 'claimed' | 'resolved'
  latitude: number
  longitude: number
  claimer_id?: string
  claimer: {first_name?: string, last_name?: string} | null
}

export default function Dashboard() {
  const router = useRouter()
  const [timeRange, setTimeRange] = useState<TimeRange>('7days')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [userClaims, setUserClaims] = useState<{[postId: string]: string}>({})
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  const postCardRef = useRef<HTMLDivElement>(null)
  const [postCardWidth, setPostCardWidth] = useState<number>(300)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is logged in using Supabase session
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error checking authentication:', error)
          router.push('/auth')
          return
        }
        
        if (session && session.user) {
          // Save user ID to localStorage for other components that might need it
          localStorage.setItem('user_id', session.user.id)
          setCurrentUserId(session.user.id)
          
          // Fetch posts now that we know the user is authenticated
          fetchPosts()
          fetchUserClaims(session.user.id)
        } else {
          console.log('No active session found')
          router.push('/auth')
        }
      } catch (error) {
        console.error('Unexpected error during auth check:', error)
        router.push('/auth')
      }
    }
    
    checkAuth()
  }, [timeRange, router])

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
          user_info:users!user_id (first_name, last_name)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Fetch error:', error)
        throw error
      }

      // Filter out posts where the user no longer exists
      const validPosts = (data || []).filter(post => post.user_info !== null)
      
      // Filter posts based on time range
      const now = new Date()
      const filteredPosts = validPosts.map(post => ({
        ...post,
        first_name: post.user_info?.first_name || '',
        last_name: post.user_info?.last_name || ''
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
              .select('first_name, last_name')
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

  const fetchUserClaims = async (userId: string) => {
    if (!userId) return
    
    try {
      // Fetch all claims by the user (not just pending ones)
      let { data: claimData, error: claimError } = await supabase
        .from('claim_questionnaire')
        .select('post_id, status')
        .eq('claimer_id', userId)
      
      // If there's an error (likely table doesn't exist), try the claims table instead
      if (claimError) {
        console.log('Trying claims table instead:', claimError.message)
        
        const { data: claimsData, error: claimsError } = await supabase
          .from('claims')
          .select('post_id, status')
          .eq('user_id', userId)
        
        if (claimsError) {
          console.log('Error fetching from claims table:', claimsError)
          // If both tables fail, just set an empty object
          setUserClaims({})
          return
        }
        
        claimData = claimsData
      }
      
      // Create a map of post_id to status
      const claimsMap: {[postId: string]: string} = {}
      if (claimData) {
        claimData.forEach(claim => {
          claimsMap[claim.post_id] = claim.status
        })
      }
      
      setUserClaims(claimsMap)
    } catch (error) {
      console.error('Error fetching user claims:', error)
      // In case of any other error, set an empty object
      setUserClaims({})
    }
  }

  const handleStartChat = async (postId: string, creatorId: string) => {
    try {
      const currentUserId = localStorage.getItem('user_id')
      
      if (!currentUserId) {
        toast.error('You must be logged in to start a chat')
        return
      }

      // Check if chat already exists
      const { data: existingChat, error: findError } = await supabase
        .from('chats')
        .select('id')
        .eq('post_id', postId)
        .eq('creator_id', creatorId)
        .eq('claimer_id', currentUserId)
        .single()

      if (findError) {
        if (findError.code !== 'PGRST116') { // Not found error is expected
          console.error('Error checking for existing chat:', findError)
          toast.error('Error checking for existing chat: ' + findError.message)
          return
        }
      } else if (existingChat) {
        // Navigate directly to existing chat
        console.log('Found existing chat:', existingChat)
        router.push(`/chat/${existingChat.id}`)
        return
      }

      // Create new chat
      console.log('Creating new chat...')
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          post_id: postId,
          creator_id: creatorId,
          claimer_id: currentUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Error creating chat:', createError)
        toast.error('Failed to create chat: ' + createError.message)
        return
      }

      // Navigate to new chat
      if (newChat) {
        console.log('Created new chat:', newChat)
        router.push(`/chat/${newChat.id}`)
      } else {
        console.error('No chat data returned after creation')
        toast.error('Failed to create chat. Please try again.')
      }
    } catch (error: any) {
      console.error('Error starting chat:', error)
      toast.error('Failed to start chat: ' + (error.message || 'Unknown error'))
    }
  }

  const handleClaimItem = async () => {
    if (!selectedPost || !currentUserId) {
      console.error('No selected post or current user ID')
      return
    }

    try {
      console.log('Claiming item:', selectedPost.id)
      
      // Update only the post status
      const { data, error: postError } = await supabase
        .from('posts')
        .update({ 
          status: 'claimed'
        })
        .eq('id', selectedPost.id)
        .select()

      if (postError) {
        console.error('Error updating post status:', postError)
        toast.error('Failed to claim item: ' + postError.message)
        return
      }

      console.log('Post claimed successfully', data)
      toast.success('Item claimed successfully!')
      
      // Start chat
      await handleStartChat(selectedPost.id, selectedPost.user_id)
      
      // Refresh posts to show updated status
      fetchPosts()
    } catch (error: any) {
      console.error('Error claiming item:', error)
      toast.error('Failed to claim item: ' + (error.message || 'Unknown error'))
    }
  }

  const handleOpenQuestionnaire = (post: Post) => {
    setSelectedPost(post)
    setShowQuestionnaire(true)
  }

  const handleQuestionnaireSubmitSuccess = () => {
    setShowQuestionnaire(false)
    setSelectedPost(null)
    
    // Update the user claims immediately after submission
    if (selectedPost && currentUserId) {
      setUserClaims(prev => ({
        ...prev,
        [selectedPost.id]: 'pending'
      }))
    }
    
    toast.success('Claim request submitted, waiting for the owner to verify')
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
    <div className="min-h-screen transition-colors bg-gray-50">
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
                <div className="text-gray-800 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#57068B] mx-auto mb-2"></div>
                  <p>Loading posts...</p>
                </div>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="col-span-full text-center text-gray-800">
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
                    <h3 className="text-lg font-semibold mb-2 text-gray-900">{post.title}</h3>
                    <div className="flex flex-col">
                      <div className="flex items-center mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {post.first_name} {post.last_name}
                        </span>
                        {post.claimer && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Claimed
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 flex-grow truncate">{post.location}</p>
                    </div>
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{post.description}</p>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-gray-500">{post.first_name} {post.last_name}</span>
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
                    ) : userClaims[post.id] ? (
                      <button
                        disabled
                        className="w-full px-4 py-2 rounded-md bg-gray-300 cursor-not-allowed"
                      >
                        {userClaims[post.id] === 'pending' ? 'Claim Pending' : 
                         userClaims[post.id] === 'approved' ? 'Claim Approved' : 
                         'Claim Rejected'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenQuestionnaire(post)}
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
      {selectedPost && !showQuestionnaire && (
        <ClaimModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onClaim={handleClaimItem}
          isOwnPost={selectedPost.user_id === currentUserId}
        />
      )}

      {/* Claim Questionnaire Modal */}
      {showQuestionnaire && selectedPost && (
        <ClaimQuestionnaire
          post={selectedPost}
          onClose={() => {
            setShowQuestionnaire(false)
            setSelectedPost(null)
          }}
          onSubmitSuccess={handleQuestionnaireSubmitSuccess}
          currentUserId={currentUserId}
        />
      )}

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={closeExpandedImage}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg"
              onClick={closeExpandedImage}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-800"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <Image
              src={expandedImage}
              alt="Expanded view"
              width={1200}
              height={800}
              className="object-contain max-h-[90vh]"
            />
          </div>
        </div>
      )}
    </div>
  )
}
