'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase'
import ChatMessages from '@/components/ChatMessages'
import { notFound } from 'next/navigation'

interface ChatData {
  id: string
  post: {
    title: string
    image_url: string
  }
  creator: {
    username: string
  }
  claimer: {
    username: string
  }
}

interface SupabaseChatData {
  id: string
  post_id: string
  creator_id: string
  claimer_id: string
  posts: {
    title: string
    image_url: string
  } | {
    title: string
    image_url: string
  }[]
  creator: {
    username: string
  } | {
    username: string
  }[]
  claimer: {
    username: string
  } | {
    username: string
  }[]
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [chat, setChat] = useState<ChatData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChat = async () => {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          id,
          post_id,
          creator_id,
          claimer_id,
          posts:posts!post_id (
            title,
            image_url
          ),
          creator:users!creator_id (
            username
          ),
          claimer:users!claimer_id (
            username
          )
        `)
        .eq('id', id)
        .single()

      if (error || !data) {
        console.error('Error fetching chat:', error)
        notFound()
        return
      }

      // Extract post data (could be an array or a single object)
      const postData = Array.isArray(data.posts) && data.posts.length > 0
        ? data.posts[0]
        : (data.posts as any) || { title: 'Unknown Post', image_url: '' }
      
      // Extract creator data
      const creatorData = Array.isArray(data.creator) && data.creator.length > 0
        ? data.creator[0]
        : (data.creator as any) || { username: 'Unknown User' }
      
      // Extract claimer data
      const claimerData = Array.isArray(data.claimer) && data.claimer.length > 0
        ? data.claimer[0]
        : (data.claimer as any) || { username: 'Unknown User' }

      const formattedChat: ChatData = {
        id: data.id,
        post: {
          title: postData.title || 'Unknown Post',
          image_url: postData.image_url || ''
        },
        creator: {
          username: creatorData.username || 'Unknown User'
        },
        claimer: {
          username: claimerData.username || 'Unknown User'
        }
      }

      setChat(formattedChat)
      setLoading(false)
    }

    fetchChat()
  }, [id])

  if (loading) {
    return <div>Loading chat...</div>
  }

  if (!chat) {
    return notFound()
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <div className="bg-white border-b px-4 py-3">
        <h2 className="text-lg font-semibold">{chat.post.title}</h2>
        <p className="text-sm text-gray-500">
          Chat between {chat.creator.username} and {chat.claimer.username}
        </p>
      </div>
      <ChatMessages chatId={id} />
    </div>
  )
}
