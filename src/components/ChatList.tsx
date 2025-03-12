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
    username: string
  }
  claimer: {
    id: string
    username: string
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
    username: string
  } | {
    id: string
    username: string
  }[]
  claimer: {
    id: string
    username: string
  } | {
    id: string
    username: string
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
        const { data, error } = await supabase
          .from('chats')
          .select(`
            id,
            post_id,
            creator_id,
            claimer_id,
            posts:posts!post_id (
              title
            ),
            creator:users!creator_id (
              id,
              username
            ),
            claimer:users!claimer_id (
              id,
              username
            ),
            messages (
              content,
              created_at
            )
          `)
          .or(`creator_id.eq.${currentUserId},claimer_id.eq.${currentUserId}`)
          .order('updated_at', { ascending: false })

        if (error) throw error

        if (data) {
          const formattedChats: Chat[] = (data as SupabaseChat[]).map((chat) => {
            // Extract post data (could be an array or a single object)
            const postData = Array.isArray(chat.posts) && chat.posts.length > 0
              ? chat.posts[0]
              : (chat.posts as any) || { title: 'Unknown Post' }
            
            // Extract creator data
            const creatorData = Array.isArray(chat.creator) && chat.creator.length > 0
              ? chat.creator[0]
              : (chat.creator as any) || { id: '', username: 'Unknown User' }
            
            // Extract claimer data
            const claimerData = Array.isArray(chat.claimer) && chat.claimer.length > 0
              ? chat.claimer[0]
              : (chat.claimer as any) || { id: '', username: 'Unknown User' }
            
            return {
              id: chat.id,
              post: {
                title: postData.title || 'Unknown Post'
              },
              creator: {
                id: creatorData.id || '',
                username: creatorData.username || 'Unknown User'
              },
              claimer: {
                id: claimerData.id || '',
                username: claimerData.username || 'Unknown User'
              },
              messages: chat.messages || []
            }
          })
          setChats(formattedChats)
        }
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

  const getParticipantUsername = (chat: Chat) => {
    if (chat.creator.id === currentUserId) {
      return chat.claimer.username
    }
    return chat.creator.username
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
                <p className="font-medium">{getParticipantUsername(chat)}</p>
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
