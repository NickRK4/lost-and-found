'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  content: string
  created_at: string
  user_id: string
  is_system_message?: boolean
  sender: {
    first_name?: string
    last_name?: string
  }
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

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!chatId) return

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true })
        
        if (error) throw error
        
        if (data) {
          setMessages(data as Message[])
        }
        
      } catch (error: unknown) {
        console.error('Error fetching messages:', (error as Error).message)
      } finally {
        setLoading(false)
        scrollToBottom()
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
          try {
            // Fetch the new message directly - simple query
            const { data: newMessage, error } = await supabase
              .from('messages')
              .select('id, content, created_at, user_id')
              .eq('id', payload.new.id)
              .single()

            if (error || !newMessage) {
              console.error('Error fetching new message:', error)
              return
            }

            // Check if this is a system message based on content patterns
            const isSystemMessage = 
              newMessage.content.includes('✅') || 
              newMessage.content.includes('❌') || 
              newMessage.content.includes('has accepted your claim') ||
              newMessage.content.includes('has rejected your claim') ||
              newMessage.content.includes('This claim has been');
            
            if (isSystemMessage) {
              const systemMessage: Message = {
                id: newMessage.id,
                content: newMessage.content,
                created_at: newMessage.created_at,
                user_id: newMessage.user_id,
                is_system_message: true,
                sender: {
                  first_name: 'System',
                  last_name: 'Notification'
                }
              }
              
              setMessages(prev => [...prev, systemMessage])
              scrollToBottom()
              return
            }
            
            // For regular messages, fetch the user profile if needed
            let userProfile = null
            try {
              const { data: userData } = await supabase
                .from('users')
                .select('first_name, last_name')
                .eq('id', newMessage.user_id)
                .single()
                
              userProfile = userData
            } catch (userError) {
              console.error('Error fetching user data for new message:', userError)
              // Continue without user data
            }
            
            // Check if this is the current user's message
            const isCurrentUser = newMessage.user_id === currentUserId;
            
            const formattedMessage: Message = {
              id: newMessage.id,
              content: newMessage.content,
              created_at: newMessage.created_at,
              user_id: newMessage.user_id,
              is_system_message: false,
              sender: {
                first_name: isCurrentUser ? 'You' : (userProfile?.first_name || 'User'),
                last_name: userProfile?.last_name || ''
              }
            }
            
            setMessages(prev => [...prev, formattedMessage])
            scrollToBottom()
          } catch (error) {
            console.error('Error handling real-time message:', error)
          }
        }
      )
      .subscribe()

    const messageSubscription = supabase
      .channel(`chat-${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
        scrollToBottom()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
      messageSubscription.unsubscribe()
    }
  }, [chatId, currentUserId, scrollToBottom])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUserId) return
    
    const messageContent = newMessage.trim()
    setNewMessage('') // Clear input immediately
    
    // Create temporary message with optimistic UI
    const tempId = `temp-${Date.now()}`
    const tempMessage: Message = {
      id: tempId,
      content: messageContent,
      created_at: new Date().toISOString(),
      user_id: currentUserId,
      is_system_message: false, // Keep this for UI purposes only
      sender: { 
        first_name: 'You', 
        last_name: '' 
      }
    }
    
    // Add to messages immediately for better UX
    setMessages(prev => [...prev, tempMessage])
    scrollToBottom()
    
    // Send message to database without waiting for response
    // This is a "fire and forget" approach
    const sendMessageToDatabase = async () => {
      try {
        await supabase
          .from('messages')
          .insert({
            chat_id: chatId,
            user_id: currentUserId,
            content: messageContent
            // Removed is_system_message field as it doesn't exist in the database
          })
        // Message sent successfully, but we don't need to do anything
        // The temporary message is already displayed and the real-time 
        // subscription might add the actual message
      } catch (error) {
        // Log the error but keep the message visible
        console.error('Error sending message:', error)
      }
    }
    
    // Execute without awaiting the result
    sendMessageToDatabase()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading ? (
          <p className="text-center text-gray-500">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-500">No messages yet</p>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`flex ${
                message.is_system_message 
                  ? 'justify-center' 
                  : message.user_id === currentUserId 
                    ? 'justify-end' 
                    : 'justify-start'
              }`}
            >
              <div
                className={`${
                  message.is_system_message
                    ? 'bg-gray-200 text-gray-800 max-w-[90%] text-center'
                    : message.user_id === currentUserId
                      ? 'bg-[#861397] text-white max-w-[70%]'
                      : 'bg-gray-100 max-w-[70%]'
                } rounded-lg p-2`}
              >
                {message.is_system_message ? (
                  <p className="text-sm font-medium mb-1 text-blue-600">System Notification</p>
                ) : (
                  <p className="text-sm font-medium mb-1">
                    {message.user_id === currentUserId 
                      ? 'You' 
                      : message.sender.first_name && message.sender.last_name 
                        ? `${message.sender.first_name} ${message.sender.last_name}` 
                        : `${message.sender.first_name || 'Unknown'}`}
                  </p>
                )}
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
      <div className="border-t p-2">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyPress={e => {
              if (e.key === 'Enter') handleSendMessage()
            }}
            placeholder="Type your message..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1 focus:outline-none focus:border-[#861397] focus:ring-1 focus:ring-[#861397]"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="bg-[#861397] text-white px-4 py-2 rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
