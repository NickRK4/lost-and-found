'use client'

import { useState, useEffect } from 'react'
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

export default function ClaimsPage() {
  const [claimRequests, setClaimRequests] = useState<ClaimRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedClaim, setSelectedClaim] = useState<ClaimRequest | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

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
        } else {
          // Redirect to login if not authenticated
          window.location.href = '/auth'
        }
      } catch (error) {
        console.error('Error checking authentication:', error)
      }
    }
    
    checkAuth()
  }, [])

  const fetchClaimRequests = async (userId: string) => {
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
          setClaimRequests(processedClaims)
        } else {
          // Process questionnaire data
          const processedQuestionnaires = await processQuestionnaireData(questionnaireData || [])
          setClaimRequests(processedQuestionnaires)
        }
      } catch (error) {
        console.error('Error fetching claim requests:', error)
      }
    } catch (error) {
      console.error('Error fetching claim requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const processClaimsData = async (claims: any[]) => {
    // For each claim, fetch the associated post and claimer details
    const claimsWithDetails = await Promise.all(claims.map(async (claim) => {
      // Fetch post details
      const { data: postData } = await supabase
        .from('posts')
        .select('*')
        .eq('id', claim.post_id)
        .single()
      
      // Fetch claimer details
      const { data: claimerData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', claim.user_id)
        .single()
      
      return {
        ...claim,
        post: postData || {},
        claimer: claimerData || {}
      }
    }))
    
    return claimsWithDetails
  }

  const processQuestionnaireData = async (questionnaires: any[]) => {
    // For each questionnaire, fetch the associated post and claimer details
    const questionnairesWithDetails = await Promise.all(questionnaires.map(async (questionnaire) => {
      // Fetch post details
      const { data: postData } = await supabase
        .from('posts')
        .select('*')
        .eq('id', questionnaire.post_id)
        .single()
      
      // Fetch claimer details
      const { data: claimerData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', questionnaire.claimer_id)
        .single()
      
      return {
        ...questionnaire,
        post: postData || {},
        claimer: claimerData || {}
      }
    }))
    
    return questionnairesWithDetails
  }

  const handleViewDetails = (claim: ClaimRequest) => {
    setSelectedClaim(claim)
    setShowDetailsModal(true)
  }

  const handleApproveClaim = async (claimId: string, postId: string, claimerId: string) => {
    try {
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
      
      // Then update the post status
      const { error: postError } = await supabase
        .from('posts')
        .update({ 
          status: 'claimed',
          claimer_id: claimerId
        })
        .eq('id', postId)
      
      if (postError) {
        console.error('Error updating post status:', postError)
        toast.error('Failed to update post status')
        return
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

  const handleRejectClaim = async (claimId: string) => {
    try {
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
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#57068B]"></div>
        </div>
      ) : claimRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-lg text-gray-600">You don't have any claim requests yet.</p>
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
                      onClick={() => handleRejectClaim(claim.id)}
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
                    onClick={() => handleRejectClaim(selectedClaim.id)}
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