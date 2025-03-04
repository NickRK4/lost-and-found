'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'

interface ClaimModalProps {
  post: {
    id: string
    title: string
    description: string
    location: string
    image_url: string
    created_at: string
    user_id: string
    username: string
  }
  onClose: () => void
  onClaim: () => void
  isOwnPost: boolean
  children?: React.ReactNode
}

export default function ClaimModal({ post, onClose, onClaim, isOwnPost, children }: ClaimModalProps) {
  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
          {/* Image */}
          <div className="relative h-64 w-full">
            <Image
              src={post.image_url}
              alt={post.title}
              fill
              style={{ objectFit: 'cover' }}
              className="rounded-t-lg"
            />
          </div>
          
          {/* Content */}
          <div className="p-6">
            <h3 className="text-2xl font-semibold mb-2">{post.title}</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-600 text-sm">Posted by</p>
                <p className="font-medium">{post.username}</p>
              </div>
              
              <div>
                <p className="text-gray-600 text-sm">Location</p>
                <p className="font-medium">{post.location}</p>
              </div>
              
              <div>
                <p className="text-gray-600 text-sm">Posted</p>
                <p className="font-medium">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
              </div>
              
              <div>
                <p className="text-gray-600 text-sm">Description</p>
                <p className="font-medium">{post.description}</p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="mt-6 space-x-3 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              
              <button
                onClick={onClaim}
                disabled={isOwnPost}
                className={`px-4 py-2 rounded-md ${
                  isOwnPost
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isOwnPost ? 'Cannot claim own post' : 'Start Chat'}
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
