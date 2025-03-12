'use client'

import { Post } from '@/types/database'
import Image from 'next/image'
import Link from 'next/link'
import { MessageCircle, MapPin } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface PostCardProps {
  post: Post
}

export default function PostCard({ post }: PostCardProps) {
  const formattedDate = formatDistanceToNow(new Date(post.created_at), { addSuffix: true })

  return (
    <article className="border rounded-lg overflow-hidden bg-white mb-6 last:mb-0 max-w-md mx-auto">
      {/* Post header */}
      <div className="flex items-center p-4">
        <div className="flex-1">
          <p className="text-sm text-gray-500">
            {formattedDate}
          </p>
        </div>
      </div>

      {/* Image */}
      <div className="relative w-full aspect-square bg-gray-100">
        <Image
          src={post.image_url}
          alt={post.description}
          fill
          className="object-cover"
          sizes="(min-width: 768px) 384px, 100vw"
          priority
        />
      </div>

      {/* Post content */}
      <div className="p-4 space-y-2">
        <p className="text-sm sm:text-base">{post.description}</p>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{post.location}</span>
        </div>

        {/* Actions */}
        <div className="pt-2">
          <Link
            href={`/chat/${post.id}`}
            className="inline-flex items-center gap-2 text-var(--primary) hover:text-var(--primary-dark) text-sm font-medium sm:text-base"
          >
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Contact about this item</span>
          </Link>
        </div>
      </div>
    </article>
  )
}
