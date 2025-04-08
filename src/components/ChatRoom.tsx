'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Send, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
}

interface Post {
  id: string;
  image_url: string;
  description: string;
  created_at: string;
  user_id: string;
  chats?: {
    id: string;
  }[];
}

export default function ChatRoom({ post }: { post: Post }) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [chatId, setChatId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const initializeChat = useCallback(async () => {
    // Check if chat exists or create new one
    let chat = post.chats?.[0]
    
    if (!chat) {
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert({
          post_id: post.id,
          sender_id: 'anonymous', // Will be updated with real user ID
          receiver_id: post.user_id,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating chat:', error)
        return
      }
      
      chat = newChat
    }

    if (chat) {
      setChatId(chat.id)

      // Fetch existing messages
      const { data: existingMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: true })

      if (existingMessages) {
        setMessages(existingMessages)
      }
    }
  }, [post.chats, post.id, post.user_id])

  useEffect(() => {
    // Initialize chat and fetch messages
    initializeChat()
    
    // Subscribe to new messages
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((current) => [...current, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId, post.id, initializeChat])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !chatId) return

    try {
      const { error } = await supabase.from('messages').insert({
        chat_id: chatId,
        content: newMessage.trim(),
        sender_id: 'anonymous', // Will be updated with real user ID
      })

      if (error) throw error
      
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  return (
    <>
      {/* Chat sidebar for mobile */}
      <div className="w-full md:w-80 border-r bg-white flex flex-col">
        <div className="p-4 border-b flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="md:hidden p-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-full hover:bg-opacity-80 disabled:opacity-50"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-semibold">Item Details</h2>
        </div>
        <div className="p-4">
          <div className="relative aspect-square mb-4 bg-gray-100 rounded-md overflow-hidden">
            <Image
              src={post.image_url}
              alt={post.description}
              fill
              className="object-cover"
            />
          </div>
          <p className="text-sm mb-2">{post.description}</p>
          <p className="text-sm text-gray-500">
            Posted {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender_id === 'anonymous' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] px-4 py-2 rounded-lg ${
                    message.sender_id === 'anonymous'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {formatDistanceToNow(new Date(message.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
          <div className="max-w-2xl mx-auto flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="p-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-full hover:bg-opacity-80 disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
