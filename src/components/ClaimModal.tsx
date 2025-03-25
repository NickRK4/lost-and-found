'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';

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
    first_name: string
    last_name: string
    latitude?: number
    longitude?: number
  }
  onClose: () => void
  onClaim: () => void
  isOwnPost: boolean
  children?: React.ReactNode
}

export default function ClaimModal({ post, onClose, onClaim, isOwnPost, children }: ClaimModalProps) {
  const [coordinates, setCoordinates] = useState<[number, number]>([51.505, -0.09]);
  const [showMap, setShowMap] = useState(false);
  const [showFullScreenMap, setShowFullScreenMap] = useState(false);

  useEffect(() => {
    // Set coordinates from post if available
    if (post.latitude && post.longitude) {
      setCoordinates([post.latitude, post.longitude]);
    }
  }, [post.latitude, post.longitude]);

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
                <p className="font-medium">{post.first_name + "" + post.last_name}</p>
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
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Location</p>
                    <p className="font-medium mt-1 truncate">{post.location}</p>
                  </div>
                  <button
                    onClick={() => setShowFullScreenMap(true)}
                    className="flex items-center text-[#57068B] hover:text-[#6A0BA7] transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-[#57068B] focus:ring-opacity-50 rounded-md px-3 py-1.5"
                  >
                    <span className="mr-1">Show Map</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md text-[#57068B] hover:text-[#6A0BA7] border border-[#57068B] hover:bg-[#57068B]/5 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={onClaim}
                disabled={isOwnPost}
                className={`px-4 py-2 rounded-md text-white transition-colors ${
                  isOwnPost
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-[#57068B] hover:bg-[#6A0BA7]'
                }`}
              >
                {isOwnPost ? 'Cannot claim own post' : 'Start Chat'}
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>

      {/* Fullscreen Map Modal */}
      {showFullScreenMap && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg w-[90%] h-[90%] max-w-4xl max-h-[90vh] overflow-hidden relative">
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setShowFullScreenMap(false)}
                className="bg-white rounded-full p-2 shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#57068B] focus:ring-opacity-50"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>
            <div className="h-full w-full">
              <MapComponent
                coordinates={coordinates}
                setCoordinates={setCoordinates}
                address={post.location}
                setAddress={() => {}}
                interactive={false}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
