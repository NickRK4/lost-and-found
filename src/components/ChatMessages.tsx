'use client'

import { useState, useEffect, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  content: string
  created_at: string
  user_id: string
  sender: {
    username: string
  }
}

interface RawMessage {
  id: string
  content: string
  created_at: string
  user_id: string
  sender: {
    username: string
  }[]
}

interface ChatMessagesProps {
  chatId: string
}

export default function ChatMessages({ chatId }: ChatMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentUserId = localStorage.getItem('user_id')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (!chatId) return

    const fetchMessages = async () => {
      try {
        const { data: messagesData, error } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            created_at,
            user_id,
            sender:users (
              username
            )
          `)
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error fetching messages:', error)
          return
        }

        if (messagesData) {
          const formattedMessages: Message[] = (messagesData as RawMessage[]).map(msg => ({
            id: msg.id,
            content: msg.content,
            created_at: msg.created_at,
            user_id: msg.user_id,
            sender: msg.sender[0] || { username: 'Unknown User' }
          }))
          setMessages(formattedMessages)
        }
        setLoading(false)
        scrollToBottom()
      } catch (error) {
        console.error('Unexpected error:', error)
      }
    }

    fetchMessages()

    // Set up real-time subscription
    const channel = supabase.channel('messages')
    
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        async (payload) => {
          // Fetch the complete message data including the sender
          const { data: newMessageData, error } = await supabase
            .from('messages')
            .select(`
              id,
              content,
              created_at,
              user_id,
              sender:users (
                username
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (error) {
            console.error('Error fetching new message:', error)
            return
          }

          if (newMessageData) {
            const formattedMessage: Message = {
              id: newMessageData.id,
              content: newMessageData.content,
              created_at: newMessageData.created_at,
              user_id: newMessageData.user_id,
              sender: (newMessageData as RawMessage).sender[0] || { username: 'Unknown User' }
            }
            setMessages(prev => [...prev, formattedMessage])
            scrollToBottom()
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [chatId])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    // Create temporary message
    const tempMessage = {
      id: Date.now().toString(), // Temporary ID
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
      user_id: currentUserId || '',
      sender: { username: 'You' }
    }

    // Optimistically add to messages
    setMessages(prev => [...prev, tempMessage])
    setNewMessage('')
    scrollToBottom()

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          user_id: currentUserId,
          content: newMessage.trim()
        })

      if (error) throw error
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove the temporary message if there was an error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <p className="text-center text-gray-500">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-500">No messages yet</p>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`flex ${
                message.user_id === currentUserId ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.user_id === currentUserId
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100'
                }`}
              >
                <p className="text-sm font-medium mb-1">
                  {message.sender.username}
                </p>
                <p>{message.content}</p>
                <p className="text-xs mt-1 opacity-75">
                  {formatDistanceToNow(new Date(message.created_at))} ago
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyPress={e => {
              if (e.key === 'Enter') handleSendMessage()
            }}
            placeholder="Type your message..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
