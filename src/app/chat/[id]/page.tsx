'use client'

import { useEffect, useState, use } from 'react'
import { getSafeSupabaseClient, isClient } from '@/lib/supabaseHelpers'
import ChatMessages from '@/components/ChatMessages'
import Link from 'next/link'

interface PostData {
  title?: string;
  image_url?: string;
}

interface UserData {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface ChatData {
  id: string
  post: {
    title: string
    image_url: string
  }
  creator: {
    first_name: string
    last_name: string
  }
  user: {
    first_name: string
    last_name: string
  }
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [chat, setChat] = useState<ChatData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChat = async () => {
      if (!isClient()) return;
      
      try {
        if (!id) {
          setError('No chat ID provided')
          setLoading(false)
          return
        }

        console.log('Fetching chat with ID:', id)
        
        // Safely get the Supabase client
        const supabase = getSafeSupabaseClient();
        if (!supabase) {
          setError('Unable to initialize Supabase client');
          setLoading(false);
          return;
        }
        
        // First fetch the chat data
        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .select('id, post_id, creator_id, claimer_id')
          .eq('id', id)
          .single()

        if (chatError) {
          console.error('Error fetching chat:', chatError)
          setError(`Error fetching chat: ${chatError.message}`)
          setLoading(false)
          return
        }

        if (!chatData) {
          console.error('No chat data found for ID:', id)
          setError('Chat not found')
          setLoading(false)
          return
        }

        // Create safely typed variables
        const chatId = String(chatData.id || '');
        const postId = String(chatData.post_id || '');
        const creatorId = String(chatData.creator_id || '');
        const claimerId = String(chatData.claimer_id || '');

        console.log('Chat data received:', chatData)

        // Fetch post data
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('title, image_url')
          .eq('id', postId)
          .single()

        if (postError) {
          console.error('Error fetching post:', postError)
        }

        // Fetch creator data
        const { data: creatorData, error: creatorError } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .eq('id', creatorId)
          .single()

        if (creatorError) {
          console.error('Error fetching creator:', creatorError)
          // Continue with default values
        }

        // Fetch user data (claimer)
        const { data: claimerData, error: claimerError } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .eq('id', claimerId)
          .single()

        if (claimerError) {
          console.error('Error fetching claimer:', claimerError)
          // Continue with default values
        }

        const postDataTyped = (postData || {}) as PostData;
        const creatorDataTyped = (creatorData || {}) as UserData;
        const claimerDataTyped = (claimerData || {}) as UserData;

        const formattedChat: ChatData = {
          id: chatId,
          post: {
            title: postDataTyped.title || 'Unknown Post',
            image_url: postDataTyped.image_url || ''
          },
          creator: {
            first_name: creatorDataTyped.first_name || 'Unknown',
            last_name: creatorDataTyped.last_name || ''
          },
          user: {
            first_name: claimerDataTyped.first_name || 'Unknown',
            last_name: claimerDataTyped.last_name || ''
          }
        }

        setChat(formattedChat)
      } catch (err) {
        console.error('Error in chat fetch:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchChat()
  }, [id])

  if (loading) {
    return <div className="flex justify-center items-center h-[calc(100vh-64px)]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Loading chat...</p>
      </div>
    </div>
  }

  if (error) {
    return <div className="flex justify-center items-center h-[calc(100vh-64px)]">
      <div className="text-center p-4 max-w-md">
        <div className="text-red-500 text-5xl mb-4">&#x26A0;</div>
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Link href="/dashboard" className="text-blue-500 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    </div>
  }

  if (!chat) {
    return <div className="flex justify-center items-center h-[calc(100vh-64px)]">
      <div className="text-center p-4 max-w-md">
        <div className="text-yellow-500 text-5xl mb-4">&#x1F50D;</div>
        <h2 className="text-xl font-semibold mb-2">Chat Not Found</h2>
        <p className="text-gray-600 mb-4">The chat you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
        <Link href="/dashboard" className="text-blue-500 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    </div>
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <div className="bg-white border-b px-4 py-3">
        <h2 className="text-lg font-semibold">{chat.post.title}</h2>
        <p className="text-sm text-gray-500">
          Chat between {chat.creator.first_name} {chat.creator.last_name} and {chat.user.first_name} {chat.user.last_name}
        </p>
      </div>
      <ChatMessages chatId={id} />
    </div>
  )
}
