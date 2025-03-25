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
          .limit(10) // Limit to 10 most recent chats for better performance

        if (chatsError) {
          console.error('Error fetching chats:', chatsError)
          throw chatsError
        }

        if (!chatsData || chatsData.length === 0) {
          setChats([])
          setLoading(false)
          return
        }

        // Get all unique post IDs, creator IDs, and claimer IDs
        const postIds = [...new Set(chatsData.map(chat => chat.post_id))]
        const userIds = [...new Set([
          ...chatsData.map(chat => chat.creator_id),
          ...chatsData.map(chat => chat.claimer_id)
        ])]

        // Batch fetch posts
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('id, title')
          .in('id', postIds)

        if (postsError) {
          console.error('Error fetching posts:', postsError)
        }

        // Batch fetch users
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', userIds)

        if (usersError) {
          console.error('Error fetching users:', usersError)
        }

        // Create lookup maps for faster access
        const postsMap = (postsData || []).reduce((map, post) => {
          map[post.id] = post
          return map
        }, {} as Record<string, any>)

        const usersMap = (usersData || []).reduce((map, user) => {
          map[user.id] = user
          return map
        }, {} as Record<string, any>)

        // Process each chat
        const formattedChats: Chat[] = await Promise.all(chatsData.map(async (chat) => {
          // Fetch the latest message for this chat
          const { data: messagesData, error: messagesError } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)

          if (messagesError) {
            console.error('Error fetching messages for chat', chat.id, messagesError)
          }

          return {
            id: chat.id,
            post: {
              title: (postsMap[chat.post_id]?.title) || 'Unknown Post'
            },
            creator: {
              id: chat.creator_id,
              first_name: usersMap[chat.creator_id]?.first_name || 'Unknown',
              last_name: usersMap[chat.creator_id]?.last_name || 'User'
            },
            user: {
              id: chat.claimer_id,
              first_name: usersMap[chat.claimer_id]?.first_name || 'Unknown',
              last_name: usersMap[chat.claimer_id]?.last_name || 'User'
            },
            messages: messagesData || []
          }
        }))

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
