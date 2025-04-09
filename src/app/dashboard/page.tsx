'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSafeSupabaseClient, isClient } from '@/lib/supabaseHelpers'
import Image from 'next/image'
import ClaimModal from '@/components/ClaimModal'
import debounce from 'lodash.debounce'
import toast from 'react-hot-toast'
import ClaimQuestionnaire from '@/components/ClaimQuestionnaire'

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

// Create a type for a function with a cancel method
type DebouncedFunctionType = {
  (query: string, postsArray: Post[]): void;
  cancel: () => void;
};

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
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    if (!isClient()) return;
    
    setLoading(true)
    setPosts([]) // Clear posts immediately to avoid showing stale data
    setFilteredPosts([]) // Clear filtered posts as well
    
    try {
      const supabase = getSafeSupabaseClient();
      if (!supabase) {
        console.error('Unable to initialize Supabase client');
        setLoading(false);
        return;
      }
      
      // First, get all posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        toast.error('Failed to load posts');
        setLoading(false);
        return;
      }

      // Get all user IDs from posts to fetch user information
      const userIds = [...new Set(postsData.map(post => post.user_id))].filter(Boolean);
      
      // Fetch user information
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', userIds);
        
      if (usersError) {
        console.error('Error fetching users:', usersError);
        toast.error('Failed to load user information');
        setLoading(false);
        return;
      }
      
      // Create a map of user IDs to user information for quick lookup
      const userMap: {[userId: string]: {first_name: string, last_name: string}} = {};
      usersData.forEach(user => {
        if (user && typeof user.id === 'string') {
          userMap[user.id] = {
            first_name: String(user.first_name || ''),
            last_name: String(user.last_name || '')
          };
        }
      });
      
      // Create properly typed Post objects
      const typedPosts: Post[] = postsData.map(post => {
        const userId = typeof post.user_id === 'string' ? post.user_id : '';
        const userInfo = userMap[userId] || { first_name: '', last_name: '' };
        
        return {
          id: String(post.id || ''),
          title: String(post.title || ''),
          description: String(post.description || ''),
          location: String(post.location || ''),
          image_url: String(post.image_url || ''),
          created_at: String(post.created_at || ''),
          user_id: String(post.user_id || ''),
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
          status: (post.status as 'active' | 'claimed' | 'resolved') || 'active',
          latitude: Number(post.latitude || 0),
          longitude: Number(post.longitude || 0),
          claimer_id: post.claimer_id ? String(post.claimer_id) : undefined,
          claimer: post.claimer || null
        };
      });
      
      // Filter posts based on time range
      const now = new Date();
      const filteredByTime = typedPosts.filter(post => {
        const postDate = new Date(post.created_at);
        const diffDays = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24);
        
        switch (timeRange) {
          case '1day':
            return diffDays <= 1;
          case '7days':
            return diffDays <= 7;
          case 'older':
            return diffDays > 7;
          default:
            return true;
        }
      });
      
      setPosts(filteredByTime);
      setFilteredPosts(filteredByTime);
    } catch (error) {
      console.error('Error fetching posts:', error)
      toast.error('Failed to load posts. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, [timeRange]) // Add timeRange as a dependency
  
  useEffect(() => {
    // Check if user is logged in using Supabase session
    const checkAuth = async () => {
      if (!isClient()) return;
      
      try {
        const supabase = getSafeSupabaseClient();
        if (!supabase) {
          console.error('Unable to initialize Supabase client');
          router.push('/auth');
          return;
        }
        
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
          
          // Fetch claims by the user
          if (session.user.id) {
            fetchUserClaims(session.user.id)
          }
        } else {
          router.push('/auth')
        }
      } catch (error) {
        console.error('Error in auth check:', error)
        router.push('/auth')
      }
    }
    
    checkAuth()
  }, [fetchPosts, router])
  
  const fetchUserClaims = async (userId: string) => {
    if (!userId) return
    
    try {
      const supabase = getSafeSupabaseClient();
      if (!supabase) {
        console.error('Unable to initialize Supabase client');
        return;
      }
      
      // Fetch all claims by the user (not just pending ones)
      const { data: initialClaimData, error: claimError } = await supabase
        .from('claims')
        .select('post_id, status')
        .eq('claimer_id', userId)
      
      if (claimError) {
        console.error('Error fetching user claims:', claimError)
        return
      }
      
      // Create a map of post IDs to claim status
      const claimsMap: {[postId: string]: string} = {}
      initialClaimData.forEach((claim) => {
        if (claim && typeof claim.post_id === 'string') {
          claimsMap[claim.post_id] = String(claim.status || 'pending')
        }
      })
      
      setUserClaims(claimsMap)
    } catch (error) {
      console.error('Error fetching user claims:', error)
    }
  }
  
  const handleStartChat = async (postId: string, creatorId: string) => {
    if (!currentUserId) {
      toast.error('You must be logged in to chat with the owner')
      return
    }
    
    if (!postId || !creatorId) {
      toast.error('Missing post or creator information')
      return
    }

    try {
      const supabase = getSafeSupabaseClient();
      if (!supabase) {
        console.error('Unable to initialize Supabase client');
        return;
      }
      
      // Check if chat already exists
      const { data: existingChat, error: findError } = await supabase
        .from('chats')
        .select('id')
        .eq('post_id', postId)
        .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${creatorId}),and(user1_id.eq.${creatorId},user2_id.eq.${currentUserId})`)
        .maybeSingle()

      if (findError) {
        console.error('Error finding chat:', findError)
        toast.error('Error starting chat')
        return
      }
      
      let chatId
      
      if (existingChat) {
        chatId = existingChat.id
      } else {
        // Create a new chat
        const { data: newChat, error: createError } = await supabase
          .from('chats')
          .insert({
            post_id: postId,
            user1_id: currentUserId,
            user2_id: creatorId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single()
        
        if (createError) {
          console.error('Error creating chat:', createError)
          toast.error('Failed to start chat')
          return
        }
        
        chatId = newChat.id
      }
      
      // Navigate to the chat page
      if (chatId) {
        router.push(`/chat/${chatId}`)
      } else {
        toast.error('Failed to get chat ID')
      }
    } catch (error) {
      console.error('Error starting chat:', error)
      toast.error('An error occurred while starting the chat')
    }
  }
  
  const handleClaimItem = async () => {
    if (!selectedPost) return
    
    try {
      console.log('Claiming item:', selectedPost.id)
      
      const supabase = getSafeSupabaseClient();
      if (!supabase) {
        console.error('Unable to initialize Supabase client');
        return;
      }
      
      // Update only the post status
      const { error: postError } = await supabase
        .from('posts')
        .update({ 
          status: 'claimed',
          claimer_id: currentUserId,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPost.id)
        .select()
        .single()
      
      if (postError) {
        console.error('Error updating post status:', postError)
        toast.error('Failed to claim item. Please try again.')
        return
      }
      
      // Create a claim record
      const { error: claimError } = await supabase
        .from('claims')
        .insert({
          post_id: selectedPost.id,
          claimer_id: currentUserId,
          status: 'pending',
          created_at: new Date().toISOString()
        })
      
      if (claimError) {
        console.error('Error creating claim record:', claimError)
        toast.error('Failed to record claim. Please try again.')
        // Continue anyway since the post was updated
      }
      
      toast.success('Item claimed successfully! You can now message the owner.')
      
      // Start a chat with the owner
      handleStartChat(selectedPost.id, selectedPost.user_id)
      
      // Close the modal
      setSelectedPost(null)
      
      // Refresh the posts
      fetchPosts()
    } catch (error) {
      console.error('Error claiming item:', error)
      toast.error('An unexpected error occurred. Please try again.')
    }
  }
  
  const handleOpenQuestionnaire = (post: Post) => {
    setSelectedPost(post)
    setShowQuestionnaire(true)
  }
  
  const handleQuestionnaireSubmitSuccess = () => {
    // Close the questionnaire
    setShowQuestionnaire(false)
    setSelectedPost(null)
    
    toast.success('Your answers have been submitted. The owner will review your claim.')
    
    // Refetch posts and claims to get updated data
    fetchPosts()
    if (currentUserId) {
      fetchUserClaims(currentUserId)
    }
  }
  
  // Create a debounced search function that can be properly canceled
  const debouncedFunction = useRef(debounce((query: string, postsArray: Post[]) => {
    if (!postsArray.length) return; // Don't run if posts haven't loaded yet
    
    const searchFiltered = query
      ? postsArray.filter(post =>
          post.title.toLowerCase().includes(query.toLowerCase()) ||
          post.description.toLowerCase().includes(query.toLowerCase())
        )
      : postsArray

    setFilteredPosts(searchFiltered)
  }, 300)).current;
  
  // Wrap it in a stable callback with proper typing
  const debouncedSearchFn = useCallback((query: string, postsArray: Post[]) => {
    debouncedFunction(query, postsArray);
  }, [debouncedFunction]) as DebouncedFunctionType;
  
  // Add the cancel property to the function
  debouncedSearchFn.cancel = debouncedFunction.cancel;

  useEffect(() => {
    debouncedSearchFn(searchQuery, posts)
    return () => {
      debouncedSearchFn.cancel()
    }
  }, [searchQuery, debouncedSearchFn, posts])

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
