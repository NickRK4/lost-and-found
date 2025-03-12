'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Chat {
  id: string
  post_id: string
  last_message?: string
  last_message_time?: string
  post: {
    id: string
    image_url: string
    description: string
    created_at: string
  }
}

export default function ChatSidebar({ onClose }: { onClose?: () => void }) {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChats()
  }, [])

  const fetchChats = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          id,
          post_id,
          posts!inner (
            id,
            image_url,
            description,
            created_at
          ),
          messages (
            content,
            created_at
          )
        `)
        .order('created_at', { foreignTable: 'messages', ascending: false })

      if (error) throw error

      // Safely type and transform the data
      const formattedChats: Chat[] = (data || []).map((chat: any) => ({
        id: chat.id,
        post_id: chat.post_id,
        last_message: chat.messages?.[0]?.content || undefined,
        last_message_time: chat.messages?.[0]?.created_at || undefined,
        post: {
          id: chat.posts.id,
          image_url: chat.posts.image_url,
          description: chat.posts.description,
          created_at: chat.posts.created_at
        }
      }))

      setChats(formattedChats)
    } catch (error) {
      console.error('Error fetching chats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-gray-500">Loading chats...</p>
      </div>
    )
  }

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-gray-500">
        <MessageSquare className="w-8 h-8 mb-2" />
        <p>No chats yet</p>
        <p className="text-sm">Start a conversation by clicking "Contact" on a post</p>
      </div>
    )
  }

  return (
    <div className="h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Messages</h2>
      </div>
      <div className="overflow-y-auto h-[calc(100%-57px)]">
        {chats.map((chat) => (
          <a
            key={chat.id}
            href={`/chat/${chat.post_id}`}
onClick={() => onClose?.()}
            className="flex items-start gap-3 p-4 hover:bg-gray-50 border-b transition-colors"
          >
            <div className="relative w-14 h-14 rounded-md overflow-hidden flex-shrink-0">
              <Image
                src={chat.post.image_url}
                alt=""
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <p className="text-sm font-medium line-clamp-1">
                  {chat.post.description}
                </p>
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
        ))}
      </div>
    </div>
  )
}
