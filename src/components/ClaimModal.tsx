'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import dynamic from 'next/dynamic';

// Dynamically import the MapComponent
const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });

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
    coordinates?: string
  }
  onClose: () => void
  onClaim: () => void
  isOwnPost: boolean
  children?: React.ReactNode
}

export default function ClaimModal({ post, onClose, onClaim, isOwnPost, children }: ClaimModalProps) {
  const [coordinates, setCoordinates] = useState<[number, number]>([51.505, -0.09]);

  useEffect(() => {
    // Parse coordinates from post if available
    if (post.coordinates) {
      try {
        // Format is typically "POINT(longitude latitude)"
        const match = post.coordinates.match(/POINT\(([^ ]+) ([^ ]+)\)/);
        if (match && match.length === 3) {
          const lon = parseFloat(match[1]);
          const lat = parseFloat(match[2]);
          setCoordinates([lat, lon]);
        }
      } catch (error) {
        console.error('Error parsing coordinates:', error);
      }
    }
  }, [post.coordinates]);

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
            <h3 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">{post.title}</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Posted by</p>
                <p className="font-medium">{post.username}</p>
              </div>
              
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Location</p>
                <p className="font-medium">{post.location}</p>
              </div>
              
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Posted</p>
                <p className="font-medium">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
              </div>
              
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Description</p>
                <p className="font-medium">{post.description}</p>
              </div>
              
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Map Location</p>
                <MapComponent
                  coordinates={coordinates}
                  setCoordinates={setCoordinates}
                  address={post.location}
                  setAddress={() => {}}
                  interactive={false}
                />
              </div>
            </div>
            
            {/* Actions */}
            <div className="mt-6 space-x-3 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              
              <button
                onClick={onClaim}
                disabled={isOwnPost}
                className={`px-4 py-2 rounded-md ${
                  isOwnPost
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-[#550688] text-white hover:bg-opacity-90'
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
