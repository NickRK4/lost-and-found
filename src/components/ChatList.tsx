'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSafeSupabaseClient, isClient } from '@/lib/supabaseHelpers'

// Define expected types for data from Supabase
interface PostData {
  id: string;
  title: string;
}

interface UserData {
  id: string;
  first_name: string;
  last_name: string;
}

interface MessageData {
  content: string;
  created_at: string;
}

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
  otherUser: {
    id: string
    first_name: string
    last_name: string
  }
  messages: {
    content: string
    created_at: string
  }[]
}

export default function ChatList({ onClose }: { onClose?: () => void }) {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!isClient()) return;
    
    setCurrentUserId(localStorage.getItem('user_id'));
    
    const fetchChats = async () => {
      if (!currentUserId) return;
      
      try {
        const supabase = getSafeSupabaseClient();
        if (!supabase) {
          console.error('Unable to initialize Supabase client');
          setLoading(false);
          return;
        }
        
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

        // Get all unique post IDs and user IDs
        const postIds = [...new Set(chatsData.map(chat => chat.post_id).filter(Boolean))]
        const userIds = [...new Set([
          ...chatsData.map(chat => chat.creator_id),
          ...chatsData.map(chat => chat.claimer_id)
        ].filter(Boolean))]

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
        const postsMap: Record<string, PostData> = {};
        if (postsData) {
          for (const post of postsData) {
            if (post && typeof post.id === 'string') {
              postsMap[post.id] = {
                id: post.id,
                title: typeof post.title === 'string' ? post.title : 'Unknown Post'
              };
            }
          }
        }

        const usersMap: Record<string, UserData> = {};
        if (usersData) {
          for (const user of usersData) {
            if (user && typeof user.id === 'string') {
              usersMap[user.id] = {
                id: user.id,
                first_name: typeof user.first_name === 'string' ? user.first_name : 'Unknown',
                last_name: typeof user.last_name === 'string' ? user.last_name : 'User'
              };
            }
          }
        }

        // Process each chat
        const formattedChats: Chat[] = [];
        
        if (chatsData) {
          for (const chat of chatsData) {
            // Ensure chat.id is a string
            const chatId = typeof chat.id === 'string' ? chat.id : String(chat.id);
            
            // Fetch the latest message for this chat
            const messageResponse = await supabase
              .from('messages')
              .select('content, created_at')
              .eq('chat_id', chatId)
              .order('created_at', { ascending: false })
              .limit(1);
              
            const messagesData = messageResponse.data || [];
            const messagesError = messageResponse.error;
            
            if (messagesError) {
              console.error('Error fetching messages for chat', chatId, messagesError);
            }
            
            const creator_id = typeof chat.creator_id === 'string' ? chat.creator_id : '';
            const claimer_id = typeof chat.claimer_id === 'string' ? chat.claimer_id : '';
            const otherUserId = creator_id === currentUserId ? claimer_id : creator_id;
            
            const formattedMessages: MessageData[] = [];
            for (const msg of messagesData) {
              formattedMessages.push({
                content: typeof msg.content === 'string' ? msg.content : '',
                created_at: typeof msg.created_at === 'string' ? msg.created_at : ''
              });
            }

            const post_id = typeof chat.post_id === 'string' ? chat.post_id : '';
            
            formattedChats.push({
              id: chatId,
              post: {
                title: post_id && postsMap[post_id] 
                  ? postsMap[post_id].title 
                  : 'Unknown Post'
              },
              creator: {
                id: creator_id,
                first_name: creator_id && usersMap[creator_id] 
                  ? usersMap[creator_id].first_name 
                  : 'Unknown',
                last_name: creator_id && usersMap[creator_id] 
                  ? usersMap[creator_id].last_name 
                  : 'User'
              },
              user: {
                id: claimer_id,
                first_name: claimer_id && usersMap[claimer_id] 
                  ? usersMap[claimer_id].first_name 
                  : 'Unknown',
                last_name: claimer_id && usersMap[claimer_id] 
                  ? usersMap[claimer_id].last_name 
                  : 'User'
              },
              otherUser: {
                id: otherUserId,
                first_name: otherUserId && usersMap[otherUserId] 
                  ? usersMap[otherUserId].first_name 
                  : 'Unknown',
                last_name: otherUserId && usersMap[otherUserId] 
                  ? usersMap[otherUserId].last_name 
                  : 'User'
              },
              messages: formattedMessages
            });
          }
        }

        setChats(formattedChats);
      } catch (error) {
        console.error('Error fetching chats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChats()

    // Subscribe to chat updates
    const setupSubscription = async () => {
      const supabase = getSafeSupabaseClient();
      if (!supabase) return null;
      
      return supabase
        .channel('chat_updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages'
        }, () => {
          fetchChats()
        })
        .subscribe();
    };
    
    let subscription: { unsubscribe: () => void } | null = null;
    setupSubscription().then(sub => {
      subscription = sub;
    });

    return () => {
      subscription?.unsubscribe();
    }
  }, [currentUserId, onClose])

  const getParticipantName = (chat: Chat) => {
    if (!currentUserId) return 'Unknown User';
    
    if (chat.otherUser) {
      return `${chat.otherUser.first_name} ${chat.otherUser.last_name}`;
    }
    
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
            onClick={() => {
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
