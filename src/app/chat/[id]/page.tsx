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
          post:posts (
            title,
            image_url
          ),
          creator:creator_id (
            username
          ),
          claimer:claimer_id (
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

      const formattedChat: ChatData = {
        id: data.id,
        post: data.post[0] || { title: 'Unknown Post', image_url: '' },
        creator: data.creator[0] || { username: 'Unknown User' },
        claimer: data.claimer[0] || { username: 'Unknown User' }
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
