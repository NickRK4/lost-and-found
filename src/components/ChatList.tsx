'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Chat {
  id: string
  post: {
    title: string
  }
  creator: {
    id: string
    first_name: string
    last_name: string
  }
  user: {
    id: string
    first_name: string
    last_name: string
  }
  messages: {
    content: string
    created_at: string
  }[]
}

interface SupabaseChat {
  id: string
  post_id: string
  creator_id: string
  claimer_id: string
  posts: {
    title: string
  } | {
    title: string
  }[]
  creator: {
    id: string
    first_name: string
    last_name: string
  } | {
    id: string
    first_name: string
    last_name: string
  }[]
  user: {
    id: string
    first_name: string
    last_name: string
  } | {
    id: string
    first_name: string
    last_name: string
  }[]
  messages: {
    content: string
    created_at: string
  }[]
}

export default function ChatList({ onClose }: { onClose?: () => void }) {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const currentUserId = localStorage.getItem('user_id')

  useEffect(() => {
    const fetchChats = async () => {
      try {
        // First get all chats for the current user
        const { data: chatsData, error: chatsError } = await supabase
          .from('chats')
          .select('id, post_id, creator_id, claimer_id, created_at, updated_at')
          .or(`creator_id.eq.${currentUserId},claimer_id.eq.${currentUserId}`)
          .order('updated_at', { ascending: false })

        if (chatsError) {
          console.error('Error fetching chats:', chatsError)
          throw chatsError
        }

        if (!chatsData || chatsData.length === 0) {
          setChats([])
          setLoading(false)
          return
        }

        // Create an array to hold the formatted chats
        const formattedChats: Chat[] = []

        // Process each chat
        for (const chat of chatsData) {
          // Fetch post data
          const { data: postData, error: postError } = await supabase
            .from('posts')
            .select('title')
            .eq('id', chat.post_id)
            .single()

          if (postError && postError.code !== 'PGRST116') {
            console.error('Error fetching post:', postError)
          }

          // Fetch creator data
          const { data: creatorData, error: creatorError } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('id', chat.creator_id)
            .single()

          if (creatorError && creatorError.code !== 'PGRST116') {
            console.error('Error fetching creator:', creatorError)
          }

          // Fetch user data (claimer)
          const { data: claimerData, error: claimerError } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('id', chat.claimer_id)
            .single()

          if (claimerError && claimerError.code !== 'PGRST116') {
            console.error('Error fetching claimer:', claimerError)
          }

          // Fetch the latest messages
          const { data: messagesData, error: messagesError } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(5)

          if (messagesError) {
            console.error('Error fetching messages:', messagesError)
          }

          formattedChats.push({
            id: chat.id,
            post: {
              title: postData?.title || 'Unknown Post'
            },
            creator: {
              id: creatorData?.id || '',
              first_name: creatorData?.first_name || 'Unknown',
              last_name: creatorData?.last_name || 'User'
            },
            user: {
              id: claimerData?.id || '',
              first_name: claimerData?.first_name || 'Unknown',
              last_name: claimerData?.last_name || 'User'
            },
            messages: messagesData || []
          })
        }

        setChats(formattedChats)
      } catch (error) {
        console.error('Error fetching chats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChats()

    // Subscribe to chat updates
    const subscription = supabase
      .channel('chat_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, () => {
        fetchChats()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [currentUserId])

  const getParticipantName = (chat: Chat) => {
    if (chat.creator.id === currentUserId) {
      return `${chat.user.first_name} ${chat.user.last_name}`
    }
    return `${chat.creator.first_name} ${chat.creator.last_name}`
  }

  return (
    <div className="space-y-2">
      {loading ? (
        <p className="text-center text-gray-500">Loading chats...</p>
      ) : chats.length === 0 ? (
        <p className="text-center text-gray-500">No chats yet</p>
      ) : (
        chats.map(chat => (
          <Link
            key={chat.id}
            href={`/chat/${chat.id}`}
            onClick={(e) => {
              onClose?.();
            }}
            className="block p-3 rounded-lg hover:bg-[#861397]/10 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{getParticipantName(chat)}</p>
                <p className="text-sm text-gray-500">{chat.post.title}</p>
              </div>
              {chat.messages.length > 0 && (
                <p className="text-sm text-gray-500">
                  {new Date(chat.messages[0].created_at).toLocaleTimeString()}
                </p>
              )}
            </div>
            {chat.messages.length > 0 && (
              <p className="text-sm text-gray-600 mt-1 truncate">
                {chat.messages[0].content}
              </p>
            )}
          </Link>
        ))
      )}
    </div>
  )
}
