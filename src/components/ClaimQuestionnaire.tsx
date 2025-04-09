'use client'

import { useState, useRef } from 'react'
import { getSafeSupabaseClient, isClient } from '@/lib/supabaseHelpers'
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
  latitude: number
  longitude: number
}

interface ClaimQuestionnaireProps {
  post: Post | null
  onClose: () => void
  onSubmitSuccess?: () => void
  currentUserId?: string
}

export default function ClaimQuestionnaire({ post, onClose, onSubmitSuccess, currentUserId }: ClaimQuestionnaireProps) {
  const [whenLost, setWhenLost] = useState('')
  const [specificDetails, setSpecificDetails] = useState('')
  const [hasPicture, setHasPicture] = useState<boolean | null>(null)
  const [pictureFile, setPictureFile] = useState<File | null>(null)
  const [picturePreview, setPicturePreview] = useState<string | null>(null)
  const [agreeToPolicy, setAgreeToPolicy] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setPictureFile(file)
      
      // Create a preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPicturePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!post) {
      toast.error('No post selected')
      return
    }
    
    if (!whenLost || !specificDetails) {
      toast.error('Please fill in all required fields')
      return
    }
    
    if (hasPicture === null) {
      toast.error('Please select whether you have a picture')
      return
    }
    
    if (hasPicture && !pictureFile) {
      toast.error('Please upload a picture')
      return
    }
    
    if (!agreeToPolicy) {
      toast.error('Please agree to the safety policy')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Get the current user ID
      const userId = currentUserId || (isClient() ? localStorage.getItem('user_id') : null)
      
      if (!userId) {
        toast.error('You must be logged in to claim an item')
        setIsSubmitting(false)
        return
      }
      
      const supabase = getSafeSupabaseClient();
      if (!supabase) {
        toast.error('Unable to initialize Supabase client')
        setIsSubmitting(false)
        return
      }
      
      // Check if the user has already claimed this item (server-side check)
      const { data: existingClaims, error: checkError } = await supabase
        .from('claim_questionnaire')
        .select('id, status')
        .eq('post_id', post.id)
        .eq('claimer_id', userId)
      
      if (checkError) {
        console.error('Error checking existing claims:', checkError)
        // If there's an error checking claim_questionnaire, try the claims table
        const { data: existingClaimsAlt, error: checkErrorAlt } = await supabase
          .from('claims')
          .select('id, status')
          .eq('post_id', post.id)
          .eq('user_id', userId)
        
        if (!checkErrorAlt && existingClaimsAlt && existingClaimsAlt.length > 0) {
          toast.error('You have already claimed this item')
          setIsSubmitting(false)
          return
        }
      } else if (existingClaims && existingClaims.length > 0) {
        toast.error('You have already claimed this item')
        setIsSubmitting(false)
        return
      }
      
      // Also check if the post is already claimed
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('status')
        .eq('id', post.id)
        .single()
      
      if (!postError && postData && postData.status !== 'active') {
        toast.error('This item has already been claimed')
        setIsSubmitting(false)
        return
      }
      
      // Upload picture if provided
      let pictureUrl = null
      if (pictureFile) {
        const timestamp = new Date().getTime()
        const filePath = `claim-pictures/${userId}_${post.id}_${timestamp}`
        
        const { error: uploadError } = await supabase.storage
          .from('claim-pictures')
          .upload(filePath, pictureFile, {
            cacheControl: '3600',
            upsert: false
          })
        
        if (uploadError) {
          console.error('Error uploading picture:', uploadError)
          toast.error('Error uploading picture')
          setIsSubmitting(false)
          return
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('claim-pictures')
          .getPublicUrl(filePath)
        
        pictureUrl = urlData.publicUrl
      }
      
      // Submit claim questionnaire
      const { data, error } = await supabase
        .from('claim_questionnaire')
        .insert({
          post_id: post.id,
          claimer_id: userId,
          lost_date: whenLost,
          specific_details: specificDetails,
          has_picture: hasPicture,
          picture_url: pictureUrl,
          agreed_to_policy: agreeToPolicy,
          status: 'pending',
          created_at: new Date().toISOString()
        })
      
      if (error) {
        console.error('Error submitting claim:', error)
        toast.error('Failed to submit claim: ' + error.message)
        setIsSubmitting(false)
        return
      }
      
      console.log('Claim submitted successfully:', data)
      toast.success('Claim submitted successfully!')
      
      // Call the onSubmitSuccess callback if provided
      if (onSubmitSuccess) {
        onSubmitSuccess()
      } else {
        onClose()
      }
    } catch (error: unknown) {
      console.error('Error submitting claim:', error)
      toast.error('Failed to submit claim: ' + ((error as Error)?.message || 'Unknown error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Claim Questionnaire</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {post && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-700 mb-2">Item: {post.title}</h3>
              <p className="text-sm text-gray-500 mb-2">Location: {post.location}</p>
              {post.image_url && (
                <div className="relative h-40 w-full mb-2">
                  <Image
                    src={post.image_url}
                    alt={post.title}
                    fill
                    className="object-cover rounded-md"
                  />
                </div>
              )}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="whenLost">
                When did you lose this item? *
              </label>
              <input
                id="whenLost"
                type="text"
                value={whenLost}
                onChange={(e) => setWhenLost(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="e.g., Yesterday around 3pm"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="specificDetails">
                Please provide specific details about the item that only the owner would know: *
              </label>
              <textarea
                id="specificDetails"
                value={specificDetails}
                onChange={(e) => setSpecificDetails(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows={4}
                placeholder="e.g., There's a scratch on the back, my initials are engraved on the bottom"
                required
              />
            </div>
            
            <div className="mb-4">
              <p className="block text-gray-700 text-sm font-bold mb-2">
                Do you have a picture of the item? *
              </p>
              <div className="flex space-x-4 mb-2">
                <button
                  type="button"
                  onClick={() => setHasPicture(true)}
                  className={`px-4 py-2 rounded-md ${
                    hasPicture === true
                      ? 'bg-[#57068B] text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHasPicture(false)
                    setPictureFile(null)
                    setPicturePreview(null)
                  }}
                  className={`px-4 py-2 rounded-md ${
                    hasPicture === false
                      ? 'bg-[#57068B] text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  No
                </button>
              </div>
              
              {hasPicture && (
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePictureChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    {pictureFile ? 'Change Picture' : 'Upload Picture'}
                  </button>
                  
                  {picturePreview && (
                    <div className="mt-2 relative h-40 w-full">
                      <Image
                        src={picturePreview}
                        alt="Preview"
                        fill
                        className="object-contain rounded-md"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="mb-6">
              <div className="flex items-center">
                <input
                  id="agreeToPolicy"
                  type="checkbox"
                  checked={agreeToPolicy}
                  onChange={(e) => setAgreeToPolicy(e.target.checked)}
                  className="h-4 w-4 text-[#57068B] focus:ring-[#57068B] border-gray-300 rounded"
                />
                <label htmlFor="agreeToPolicy" className="ml-2 block text-sm text-gray-700">
                  I agree to New York University&apos;s safety policy for lost and found items. *{' '}
                  <Link href="/" className="text-[#57068B] hover:underline">
                    View Policy
                  </Link>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#57068B] text-white rounded-md hover:bg-[#6A0BA7] disabled:bg-gray-400"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}