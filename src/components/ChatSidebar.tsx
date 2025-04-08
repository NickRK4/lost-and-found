'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'

interface Chat {
  id: string
  post_id: string
  creator_id: string
  claimer_id: string
  last_message?: string
  last_message_time?: string
  post: {
    id: string
    title: string
    image_url: string
    description: string
    created_at: string
  }
  creator: {
    first_name?: string
    last_name?: string
  }
  claimer: {
    first_name?: string
    last_name?: string
  }
}

interface SupabaseChat {
  id: string
  post_id: string
  creator_id: string
  claimer_id: string
  posts: {
    id: string
    title: string
    image_url: string
    description: string
    created_at: string
  } | {
    id: string
    title: string
    image_url: string
    description: string
    created_at: string
  }[]
  creator: {
    first_name?: string
    last_name?: string
  } | {
    first_name?: string
    last_name?: string
  }[]
  claimer: {
    first_name?: string
    last_name?: string
  } | {
    first_name?: string
    last_name?: string
  }[]
}

export default function ChatSidebar({ onClose }: { onClose?: () => void }) {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)

  const fetchChats = async () => {
    try {
      const userId = localStorage.getItem('user_id')
      if (!userId) return

      // Get all chats with related data in a single query
      const { data, error } = await supabase
        .from('chats')
        .select(`
          id,
          post_id,
          creator_id,
          claimer_id,
          posts:posts!post_id (
            id, 
            title, 
            image_url, 
            description, 
            created_at
          ),
          creator:users!creator_id (
            first_name,
            last_name
          ),
          claimer:users!claimer_id (
            first_name,
            last_name
          )
        `)
        .or(`creator_id.eq.${userId},claimer_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching chats:', error.message, error.details)
        return
      }

      if (!data || data.length === 0) {
        setChats([])
        setLoading(false)
        return
      }

      // Get latest messages for each chat in parallel
      const chatsWithMessages = await Promise.all((data as SupabaseChat[]).map(async (chat) => {
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (messagesError) {
          console.error('Error fetching messages:', messagesError)
        }

        // Extract the post data (it comes as an array with one object or as a single object)
        const postData = Array.isArray(chat.posts) && chat.posts.length > 0
          ? chat.posts[0]
          : (chat.posts as { id: string; title: string; image_url: string; description: string; created_at: string }) || 
            { id: '', title: 'Unknown Post', image_url: '', description: '', created_at: new Date().toISOString() }
        
        // Extract the user data (it comes as an array with one object or as a single object)
        const creatorData = Array.isArray(chat.creator) && chat.creator.length > 0
          ? chat.creator[0]
          : (chat.creator as { first_name?: string; last_name?: string }) || 
            { first_name: 'Unknown', last_name: '' }
        
        const claimerData = Array.isArray(chat.claimer) && chat.claimer.length > 0
          ? chat.claimer[0]
          : (chat.claimer as { first_name?: string; last_name?: string }) || 
            { first_name: 'Unknown', last_name: '' }

        return {
          id: chat.id,
          post_id: chat.post_id,
          creator_id: chat.creator_id,
          claimer_id: chat.claimer_id,
          last_message: messagesData?.[0]?.content,
          last_message_time: messagesData?.[0]?.created_at,
          post: {
            id: postData.id || '',
            title: postData.title || 'Unknown Post',
            image_url: postData.image_url || '',
            description: postData.description || '',
            created_at: postData.created_at || new Date().toISOString()
          },
          creator: {
            first_name: creatorData.first_name || 'Unknown',
            last_name: creatorData.last_name || ''
          },
          claimer: {
            first_name: claimerData.first_name || 'Unknown',
            last_name: claimerData.last_name || ''
          }
        }
      }))

      setChats(chatsWithMessages)
    } catch (error) {
      console.error('Error in fetchChats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChats()
  }, [])

  if (loading) {
    return (
      <div className="p-4 text-center">
        <p>Loading chats...</p>
      </div>
    )
  }

  const currentUserId = localStorage.getItem('user_id')

  return (
    <div className="h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Messages</h2>
      </div>
      <div className="overflow-y-auto h-[calc(100%-57px)]">
        {chats.map((chat) => {
          const isCreator = chat.creator_id === currentUserId
          const otherUser = isCreator ? chat.claimer : chat.creator

          return (
            <a
              key={chat.id}
              href={`/chat/${chat.id}`}
              onClick={() => onClose?.()}
              className="flex items-start gap-3 p-4 hover:bg-gray-50 border-b transition-colors"
            >
              <div className="relative w-14 h-14 rounded-md overflow-hidden flex-shrink-0">
                <Image
                  src={chat.post.image_url}
                  alt={chat.post.title}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="text-sm font-medium line-clamp-1">
                      {chat.post.title || chat.post.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      with {otherUser.first_name} {otherUser.last_name}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 whitespace-nowrap">
                    {chat.last_message_time && 
                      formatDistanceToNow(new Date(chat.last_message_time), { addSuffix: true })}
                  </p>
                </div>
                {chat.last_message && (
                  <p className="text-sm text-gray-500 line-clamp-1 mt-1">
                    {chat.last_message}
                  </p>
                )}
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
