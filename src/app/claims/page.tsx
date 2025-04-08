'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import toast from 'react-hot-toast'

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
}

interface ClaimRequest {
  id: string
  post_id: string
  claimer_id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  post: Post
  claimer: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  questionnaire_data?: {
    when_lost: string
    specific_details: string
    has_picture: boolean
    picture_url?: string
  }
}

interface Notification {
  type: 'accepted' | 'rejected'
  postTitle: string
  ownerName: string
  timestamp: string
}

interface Owner {
  id: string;
  first_name: string;
  last_name: string;
}

export default function ClaimsPage() {
  const [claimRequests, setClaimRequests] = useState<ClaimRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedClaim, setSelectedClaim] = useState<ClaimRequest | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  const fetchClaimRequests = useCallback(async (userId: string) => {
    setLoading(true)
    
    try {
      // First get all posts by the current user
      const { data: userPosts, error: postsError } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', userId)
      
      if (postsError) {
        console.error('Error fetching user posts:', postsError)
        setLoading(false)
        return
      }
      
      if (!userPosts || userPosts.length === 0) {
        setClaimRequests([])
        setLoading(false)
        return
      }
      
      const postIds = userPosts.map(post => post.id)
      
      // Try to fetch claim requests from claim_questionnaire table
      try {
        const { data: questionnaireData, error: questionnaireError } = await supabase
          .from('claim_questionnaire')
          .select('*')
          .in('post_id', postIds)
          .order('created_at', { ascending: false })
        
        if (questionnaireError) {
          console.log('Trying claims table instead:', questionnaireError.message)
          
          // If there's an error, try the claims table
          const { data: claimsData, error: claimsError } = await supabase
            .from('claims')
            .select('*')
            .in('post_id', postIds)
            .order('created_at', { ascending: false })
          
          if (claimsError) {
            console.error('Error fetching claims:', claimsError)
            setLoading(false)
            return
          }
          
          // Process claims data
          const processedClaims = await processClaimsData(claimsData || [])
          setClaimRequests(processedClaims as ClaimRequest[])
        } else {
          // Process questionnaire data
          const processedQuestionnaires = await processQuestionnaireData(questionnaireData || [])
          setClaimRequests(processedQuestionnaires as ClaimRequest[])
        }
      } catch (error) {
        console.error('Error processing claim data:', error)
      } finally {
        setLoading(false)
      }
    } catch (error) {
      console.error('Error in fetchClaimRequests:', error)
      setLoading(false)
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error checking authentication:', error)
          return
        }
        
        if (session && session.user) {
          setCurrentUserId(session.user.id)
          fetchClaimRequests(session.user.id)
          fetchNotifications(session.user.id)
        }
      } catch (error) {
        console.error('Unexpected error during authentication check:', error)
      }
    }
    
    checkAuth()
  }, [fetchClaimRequests])

  const fetchNotifications = async (userId: string) => {
    try {
      // Get the last 24 hours of messages that might contain notifications
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      // Get all chats where the user is a claimer
      const { data: chats, error: chatsError } = await supabase
        .from('chats')
        .select('id, post_id')
        .eq('claimer_id', userId)
      
      if (chatsError) {
        console.error('Error fetching chats:', chatsError)
        return
      }
      
      if (!chats || chats.length === 0) return
      
      const chatIds = chats.map(chat => chat.id)
      const postIds = chats.map(chat => chat.post_id).filter(Boolean)
      
      // Get messages that might be notifications
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, content, created_at, chat_id, user_id')
        .in('chat_id', chatIds)
        .gt('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false })
      
      if (messagesError) {
        console.error('Error fetching messages:', messagesError)
        return
      }
      
      if (!messages || messages.length === 0) return
      
      // Get post information
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, title, user_id')
        .in('id', postIds)
      
      if (postsError) {
        console.error('Error fetching posts:', postsError)
        return
      }
      
      // Get post owner information
      const ownerIds = posts?.map(post => post.user_id).filter(Boolean) || []
      
      let owners: Owner[] = [];
      if (ownerIds.length > 0) {
        console.log('Fetching users for owner IDs:', ownerIds);
        try {
          const { data: ownersData, error: ownersError } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .in('id', ownerIds)
          
          if (ownersError) {
            console.error('Error fetching post owners:', ownersError)
            // Continue with empty owners array
          } else {
            owners = ownersData || []
            console.log('Successfully fetched owners:', owners.length);
          }
        } catch (e) {
          console.error('Exception during owner fetch:', e);
          // Continue with empty owners array
        }
      } else {
        console.log('No owner IDs to fetch');
      }
      
      // Create a map for easier lookup
      const postMap: Record<string, Post> = {}
      posts?.forEach((post: {
        id: string;
        title: string;
        user_id: string;
        description?: string;
        location?: string;
        image_url?: string;
        created_at?: string;
        first_name?: string;
        last_name?: string;
        status?: string;
      }) => { 
        // Ensure the post object conforms to the Post interface
        postMap[post.id] = {
          id: post.id,
          title: post.title,
          user_id: post.user_id,
          description: post.description || '',
          location: post.location || '',
          image_url: post.image_url || '',
          created_at: post.created_at || '',
          first_name: post.first_name || '',
          last_name: post.last_name || '',
          status: (post.status as 'active' | 'claimed' | 'resolved') || 'active'
        };
      })
      
      const ownerMap: Record<string, Owner> = {}
      owners.forEach(owner => { ownerMap[owner.id] = owner })
      
      const chatToPostMap: Record<string, string> = {}
      chats.forEach(chat => { chatToPostMap[chat.id] = chat.post_id })
      
      // Filter and format notifications - no filtering based on recipient_id
      const notificationMessages = messages.filter(msg => 
        msg.content.includes('has accepted') || 
        msg.content.includes('has rejected')
      )
      
      const formattedNotifications: Notification[] = notificationMessages.map(msg => {
        const postId = chatToPostMap[msg.chat_id]
        const post = postMap[postId]
        const owner = post ? ownerMap[post.user_id] : null
        
        const isAccepted = msg.content.includes('has accepted')
        const ownerName = owner ? `${owner.first_name} ${owner.last_name}`.trim() : 'Someone'
        
        return {
          type: isAccepted ? 'accepted' : 'rejected',
          postTitle: post?.title || 'Unknown item',
          ownerName,
          timestamp: new Date(msg.created_at).toLocaleString()
        }
      })
      
      setNotifications(formattedNotifications)
      
      // Show notifications if there are any
      if (formattedNotifications.length > 0) {
        setShowNotifications(true)
      }
      
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const processClaimsData = async (claims: Record<string, unknown>[]) => {
    // For each claim, fetch the associated post and claimer details
    const claimsWithDetails = await Promise.all(claims.map(async (claim) => {
      // Fetch post details
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', claim.post_id as string)
        .single()
      
      if (postError) {
        console.error(`Error fetching post for claim ${claim.id}:`, postError)
      }
      
      // Fetch claimer details
      const { data: claimerData, error: claimerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', claim.claimer_id as string)
        .single()
      
      if (claimerError) {
        console.error(`Error fetching claimer for claim ${claim.id}:`, claimerError)
      }
      
      return { ...claim, post: postData || {}, claimer: claimerData || {} } as unknown as ClaimRequest;
    }))
    
    return claimsWithDetails
  }

  const processQuestionnaireData = async (questionnaires: Record<string, unknown>[]) => {
    // For each questionnaire, fetch the associated post and claimer details
    const questionnairesWithDetails = await Promise.all(questionnaires.map(async (questionnaire) => {
      // Fetch post details
      const { data: postData } = await supabase
        .from('posts')
        .select('*')
        .eq('id', questionnaire.post_id as string)
        .single()
      
      // Fetch claimer details from users table instead of profiles
      const { data: claimerData } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', questionnaire.claimer_id as string)
        .single()
      
      // Include questionnaire details
      const questionnaireData = {
        when_lost: questionnaire.lost_date,
        specific_details: questionnaire.specific_details,
        has_picture: questionnaire.has_picture,
        picture_url: questionnaire.picture_url
      };
      
      return {
        ...questionnaire,
        post: postData || {},
        claimer: claimerData || {},
        questionnaire_data: questionnaireData
      } as unknown as ClaimRequest;
    }))
    
    return questionnairesWithDetails
  }

  const handleViewDetails = (claim: ClaimRequest) => {
    setSelectedClaim(claim)
    setShowDetailsModal(true)
  }

  const handleApproveClaim = async (claimId: string, postId: string, claimerId: string) => {
    try {
      setLoading(true)
      // Get post title
      const { data: postData, error: postFetchError } = await supabase
        .from('posts')
        .select('title')
        .eq('id', postId)
        .single()
        
      if (postFetchError) {
        console.error('Error getting post data:', postFetchError)
        toast.error('Failed to get post information')
        return
      }
      
      // Get claimer name
      const { data: claimerData, error: claimerError } = await supabase
        .from('users')
        .select('first_name')
        .eq('id', claimerId)
        .single()
        
      if (claimerError) {
        console.error('Error getting claimer data:', claimerError)
        toast.error('Failed to get claimer information')
        return
      }
      
      // First update the claim status
      const updateTable = async (table: string) => {
        const { error } = await supabase
          .from(table)
          .update({ status: 'approved' })
          .eq('id', claimId)
        
        return error
      }
      
      // Try to update in claim_questionnaire first
      let error = await updateTable('claim_questionnaire')
      
      // If that fails, try the claims table
      if (error) {
        error = await updateTable('claims')
        
        if (error) {
          console.error('Error approving claim:', error)
          toast.error('Failed to approve claim')
          return
        }
      }
      
      // Then update the post status - include claimer_id since it exists in the posts table
      const { error: postUpdateError } = await supabase
        .from('posts')
        .update({ 
          status: 'claimed',
          claimer_id: claimerId
        })
        .eq('id', postId)
      
      if (postUpdateError) {
        console.error('Error updating post status:', postUpdateError)
        toast.error('Failed to update post status')
        return
      }
      
      // Find or create the chat between the owner and claimer
      let chatId;
      
      // First try to find an existing chat
      const { data: existingChat, error: findChatError } = await supabase
        .from('chats')
        .select('id')
        .eq('post_id', postId)
        .single()
      
      if (findChatError) {
        console.log('No existing chat found, creating a new one')
        
        // Get the post owner's ID
        const { data: postData, error: postOwnerError } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', postId)
          .single()
          
        if (postOwnerError) {
          console.error('Error getting post owner:', postOwnerError)
          toast.error('Failed to get post owner information')
          return
        }
        
        // Create a new chat
        const { data: newChat, error: createChatError } = await supabase
          .from('chats')
          .insert({
            post_id: postId,
            creator_id: postData.user_id,
            claimer_id: claimerId,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single()
        
        if (createChatError) {
          console.error('Error creating chat:', createChatError)
          toast.error('Failed to create chat')
          return
        }
        
        chatId = newChat.id
      } else {
        chatId = existingChat.id
      }
      
      // Now we have a valid chatId, send the notification message
      // Get the post owner's ID first
      const { data: postOwnerData, error: postOwnerError } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single()
        
      if (postOwnerError) {
        console.error('Error getting post owner:', postOwnerError)
        toast.error('Failed to get post owner information')
        return
      }
      
      // Now get the post owner's name from the users table
      const { data: ownerUserData, error: ownerUserError } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', postOwnerData.user_id)
        .single()
        
      if (ownerUserError) {
        console.error('Error getting post owner user data:', ownerUserError)
        toast.error('Failed to get post owner information')
        return
      }
      
      // Get post owner's name
      let ownerName = "Someone"
      if (ownerUserData) {
        ownerName = `${ownerUserData.first_name} ${ownerUserData.last_name || ''}`.trim()
      }
      
      // Send a single notification message in the chat that both users can see
      const { error: chatMessageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          user_id: postOwnerData.user_id,
          content: `${ownerName} has accepted ${claimerData.first_name}'s claim for "${postData.title}". Start chatting!`
        })
        
      if (chatMessageError) {
        console.error('Error sending chat notification message:', chatMessageError)
      }
      
      toast.success('Claim approved successfully')
      
      // Refresh the claim requests
      if (currentUserId) {
        fetchClaimRequests(currentUserId)
      }
      
      // Close the modal
      setShowDetailsModal(false)
    } catch (error) {
      console.error('Error approving claim:', error)
      toast.error('Failed to approve claim')
    }
  }

  const handleRejectClaim = async (claimId: string, postId: string, claimerId: string) => {
    try {
      // Get post title
      const { data: postData, error: postFetchError } = await supabase
        .from('posts')
        .select('title')
        .eq('id', postId)
        .single()
        
      if (postFetchError) {
        console.error('Error getting post data:', postFetchError)
        toast.error('Failed to get post information')
        return
      }
      
      // Get claimer name
      const { data: claimerData, error: claimerError } = await supabase
        .from('users')
        .select('first_name')
        .eq('id', claimerId)
        .single()
        
      if (claimerError) {
        console.error('Error getting claimer data:', claimerError)
        toast.error('Failed to get claimer information')
        return
      }
      
      // First update the claim status
      const updateTable = async (table: string) => {
        const { error } = await supabase
          .from(table)
          .update({ status: 'rejected' })
          .eq('id', claimId)
        
        return error
      }
      
      // Try to update in claim_questionnaire first
      let error = await updateTable('claim_questionnaire')
      
      // If that fails, try the claims table
      if (error) {
        error = await updateTable('claims')
        
        if (error) {
          console.error('Error rejecting claim:', error)
          toast.error('Failed to reject claim')
          return
        }
      }
      
      // Then update the post status for rejected claims
      const { error: postUpdateError } = await supabase
        .from('posts')
        .update({ 
          status: 'active', // Reset to active since the claim was rejected
          claimer_id: null  // Clear the claimer_id
        })
        .eq('id', postId)
      
      if (postUpdateError) {
        console.error('Error updating post status:', postUpdateError)
        toast.error('Failed to update post status')
        return
      }
      
      // Find or create the chat between the owner and claimer
      let chatId;
      
      // First try to find an existing chat
      const { data: existingChat, error: findChatError } = await supabase
        .from('chats')
        .select('id')
        .eq('post_id', postId)
        .single()
      
      if (findChatError) {
        console.log('No existing chat found, creating a new one')
        
        // Get the post owner's ID
        const { data: postData, error: postOwnerError } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', postId)
          .single()
          
        if (postOwnerError) {
          console.error('Error getting post owner:', postOwnerError)
          toast.error('Failed to get post owner information')
          return
        }
        
        // Create a new chat
        const { data: newChat, error: createChatError } = await supabase
          .from('chats')
          .insert({
            post_id: postId,
            creator_id: postData.user_id,
            claimer_id: claimerId,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single()
        
        if (createChatError) {
          console.error('Error creating chat:', createChatError)
          toast.error('Failed to create chat')
          return
        }
        
        chatId = newChat.id
      } else {
        chatId = existingChat.id
      }
      
      // Now we have a valid chatId, send the notification message
      // Get the post owner's ID first
      const { data: postOwnerData, error: postOwnerError } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single()
        
      if (postOwnerError) {
        console.error('Error getting post owner:', postOwnerError)
        toast.error('Failed to get post owner information')
        return
      }
      
      // Now get the post owner's name from the users table
      const { data: ownerUserData, error: ownerUserError } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', postOwnerData.user_id)
        .single()
        
      if (ownerUserError) {
        console.error('Error getting post owner user data:', ownerUserError)
        toast.error('Failed to get post owner information')
        return
      }
      
      // Get post owner's name
      let ownerName = "Someone"
      if (ownerUserData) {
        ownerName = `${ownerUserData.first_name} ${ownerUserData.last_name || ''}`.trim()
      }
      
      // Send a single notification message in the chat that both users can see
      const { error: chatMessageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          user_id: postOwnerData.user_id,
          content: `${ownerName} has rejected ${claimerData.first_name}'s claim for "${postData.title}".`
        })
        
      if (chatMessageError) {
        console.error('Error sending chat notification message:', chatMessageError)
      }
      
      toast.success('Claim rejected successfully')
      
      // Refresh the claim requests
      if (currentUserId) {
        fetchClaimRequests(currentUserId)
      }
      
      // Close the modal
      setShowDetailsModal(false)
    } catch (error) {
      console.error('Error rejecting claim:', error)
      toast.error('Failed to reject claim')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Claim Requests</h1>
      
      {/* Notification alerts */}
      {showNotifications && notifications.length > 0 && (
        <div className="mb-6">
          {notifications.map((notification, index) => (
            <div 
              key={index} 
              className={`mb-3 p-4 rounded-md shadow-md flex justify-between items-center ${
                notification.type === 'accepted' ? 'bg-green-100 border-l-4 border-green-500' : 'bg-red-100 border-l-4 border-red-500'
              }`}
            >
              <div>
                <p className="font-medium">
                  {notification.type === 'accepted' 
                    ? `Your claim for "${notification.postTitle}" has been accepted` 
                    : `Your claim for "${notification.postTitle}" has been rejected`
                  } by {notification.ownerName}
                </p>
                <p className="text-sm text-gray-600">{notification.timestamp}</p>
              </div>
              <button 
                onClick={() => {
                  const newNotifications = [...notifications]
                  newNotifications.splice(index, 1)
                  setNotifications(newNotifications)
                  if (newNotifications.length === 0) {
                    setShowNotifications(false)
                  }
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <span className="sr-only">Dismiss</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#57068B]"></div>
        </div>
      ) : claimRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-lg text-gray-600">You don&apos;t have any claim requests yet.</p>
          <Link href="/dashboard" className="mt-4 inline-block px-6 py-2 bg-[#57068B] text-white rounded-md hover:bg-[#6A0BA7]">
            Back to Dashboard
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {claimRequests.map((claim) => (
            <div key={claim.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {claim.post?.image_url && (
                <div className="relative h-48 w-full">
                  <Image 
                    src={claim.post.image_url}
                    alt={claim.post.title || 'Item image'}
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              )}
              
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2">{claim.post?.title || 'Unknown Item'}</h2>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Claimed by: {claim.claimer?.first_name} {claim.claimer?.last_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Date: {new Date(claim.created_at).toLocaleDateString()}
                  </p>
                  <div className="mt-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      claim.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      claim.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                    </span>
                  </div>
                </div>
                
                {claim.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewDetails(claim)}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleApproveClaim(claim.id, claim.post_id, claim.claimer_id)}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectClaim(claim.id, claim.post_id, claim.claimer_id)}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </div>
                )}
                
                {claim.status !== 'pending' && (
                  <button
                    onClick={() => handleViewDetails(claim)}
                    className="w-full px-4 py-2 bg-[#57068B] text-white rounded-md hover:bg-[#6A0BA7]"
                  >
                    View Details
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Claim Details Modal */}
      {showDetailsModal && selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Claim Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Item Information</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p><strong>Title:</strong> {selectedClaim.post?.title}</p>
                  <p><strong>Description:</strong> {selectedClaim.post?.description}</p>
                  <p><strong>Location:</strong> {selectedClaim.post?.location}</p>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Claimer Information</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p><strong>Name:</strong> {selectedClaim.claimer?.first_name} {selectedClaim.claimer?.last_name}</p>
                  <p><strong>Email:</strong> {selectedClaim.claimer?.email}</p>
                </div>
              </div>
              
              {selectedClaim.questionnaire_data && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Questionnaire Responses</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p><strong>When Lost:</strong> {selectedClaim.questionnaire_data.when_lost}</p>
                    <p><strong>Specific Details:</strong> {selectedClaim.questionnaire_data.specific_details}</p>
                    {selectedClaim.questionnaire_data.has_picture && selectedClaim.questionnaire_data.picture_url && (
                      <div className="mt-4">
                        <p><strong>Picture:</strong></p>
                        <div className="relative h-48 w-full mt-2">
                          <Image 
                            src={selectedClaim.questionnaire_data.picture_url}
                            alt="Item picture"
                            fill
                            style={{ objectFit: 'contain' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {selectedClaim.status === 'pending' && (
                <div className="flex space-x-4 mt-6">
                  <button
                    onClick={() => handleApproveClaim(selectedClaim.id, selectedClaim.post_id, selectedClaim.claimer_id)}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                  >
                    Approve Claim
                  </button>
                  <button
                    onClick={() => handleRejectClaim(selectedClaim.id, selectedClaim.post_id, selectedClaim.claimer_id)}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    Reject Claim
                  </button>
                </div>
              )}
              
              <div className="mt-6">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}