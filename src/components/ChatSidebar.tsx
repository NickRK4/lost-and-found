'use client'

import { useState, useEffect } from 'react'
import { getSafeSupabaseClient, isClient } from '@/lib/supabaseHelpers'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'

interface Chat {
  id: string
  post_id: string
  creator_id: string
  claimer_id: string
  last_message?: string
  last_message_time?: string
  post: {
    id: string
    title: string
    image_url: string
    description: string
    created_at: string
  }
  creator: {
    first_name?: string
    last_name?: string
  }
  claimer: {
    first_name?: string
    last_name?: string
  }
}

// Redefined to handle any potential shape of data from Supabase
interface SupabasePost {
  id?: string;
  title?: string;
  image_url?: string;
  description?: string;
  created_at?: string;
}

interface SupabaseUser {
  first_name?: string;
  last_name?: string;
}

interface SupabaseChat {
  id: string;
  post_id: string;
  creator_id: string;
  claimer_id: string;
  posts?: SupabasePost | SupabasePost[] | Record<string, unknown>;
  creator?: SupabaseUser | SupabaseUser[] | Record<string, unknown>;
  claimer?: SupabaseUser | SupabaseUser[] | Record<string, unknown>;
}

export default function ChatSidebar({ onClose }: { onClose?: () => void }) {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const fetchChats = async () => {
    if (!isClient()) return;
    
    try {
      const userId = localStorage.getItem('user_id')
      if (!userId) return
      
      setCurrentUserId(userId)

      const supabase = getSafeSupabaseClient();
      if (!supabase) {
        console.error('Unable to initialize Supabase client')
        setLoading(false)
        return
      }

      // Get all chats with related data in a single query
      const { data, error } = await supabase
        .from('chats')
        .select(`
          id,
          post_id,
          creator_id,
          claimer_id,
          posts:posts!post_id (
            id, 
            title, 
            image_url, 
            description, 
            created_at
          ),
          creator:users!creator_id (
            first_name,
            last_name
          ),
          claimer:users!claimer_id (
            first_name,
            last_name
          )
        `)
        .or(`creator_id.eq.${userId},claimer_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching chats:', error.message, error.details)
        return
      }

      if (!data || data.length === 0) {
        setChats([])
        setLoading(false)
        return
      }

      // Get latest messages for each chat in parallel
      const chatsWithMessages = await Promise.all(
        (data as unknown as SupabaseChat[]).map(async (chat) => {
          // Make sure chat has valid id
          const chatId = typeof chat.id === 'string' ? chat.id : String(chat.id);
          
          const { data: messagesData, error: messagesError } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: false })
            .limit(1)

          if (messagesError) {
            console.error('Error fetching messages:', messagesError)
          }

          // Extract the post data (it comes as an array with one object or as a single object)
          let postData: SupabasePost = { 
            id: '', 
            title: 'Unknown Post', 
            image_url: '', 
            description: '', 
            created_at: new Date().toISOString() 
          };
          
          if (chat.posts) {
            if (Array.isArray(chat.posts) && chat.posts.length > 0) {
              const firstPost = chat.posts[0];
              if (firstPost && typeof firstPost === 'object') {
                postData = {
                  id: typeof firstPost.id === 'string' ? firstPost.id : '',
                  title: typeof firstPost.title === 'string' ? firstPost.title : 'Unknown Post',
                  image_url: typeof firstPost.image_url === 'string' ? firstPost.image_url : '',
                  description: typeof firstPost.description === 'string' ? firstPost.description : '',
                  created_at: typeof firstPost.created_at === 'string' ? firstPost.created_at : new Date().toISOString()
                };
              }
            } else if (chat.posts && typeof chat.posts === 'object') {
              const post = chat.posts as SupabasePost;
              postData = {
                id: typeof post.id === 'string' ? post.id : '',
                title: typeof post.title === 'string' ? post.title : 'Unknown Post',
                image_url: typeof post.image_url === 'string' ? post.image_url : '',
                description: typeof post.description === 'string' ? post.description : '',
                created_at: typeof post.created_at === 'string' ? post.created_at : new Date().toISOString()
              };
            }
          }
          
          // Extract the user data for creator
          let creatorData: SupabaseUser = { first_name: 'Unknown', last_name: '' };
          
          if (chat.creator) {
            if (Array.isArray(chat.creator) && chat.creator.length > 0) {
              const firstCreator = chat.creator[0];
              if (firstCreator && typeof firstCreator === 'object') {
                creatorData = {
                  first_name: typeof firstCreator.first_name === 'string' ? firstCreator.first_name : 'Unknown',
                  last_name: typeof firstCreator.last_name === 'string' ? firstCreator.last_name : ''
                };
              }
            } else if (chat.creator && typeof chat.creator === 'object') {
              const creator = chat.creator as SupabaseUser;
              creatorData = {
                first_name: typeof creator.first_name === 'string' ? creator.first_name : 'Unknown',
                last_name: typeof creator.last_name === 'string' ? creator.last_name : ''
              };
            }
          }
          
          // Extract the user data for claimer
          let claimerData: SupabaseUser = { first_name: 'Unknown', last_name: '' };
          
          if (chat.claimer) {
            if (Array.isArray(chat.claimer) && chat.claimer.length > 0) {
              const firstClaimer = chat.claimer[0];
              if (firstClaimer && typeof firstClaimer === 'object') {
                claimerData = {
                  first_name: typeof firstClaimer.first_name === 'string' ? firstClaimer.first_name : 'Unknown',
                  last_name: typeof firstClaimer.last_name === 'string' ? firstClaimer.last_name : ''
                };
              }
            } else if (chat.claimer && typeof chat.claimer === 'object') {
              const claimer = chat.claimer as SupabaseUser;
              claimerData = {
                first_name: typeof claimer.first_name === 'string' ? claimer.first_name : 'Unknown',
                last_name: typeof claimer.last_name === 'string' ? claimer.last_name : ''
              };
            }
          }
          
          // Create a properly typed result
          const result: Chat = {
            id: chatId,
            post_id: typeof chat.post_id === 'string' ? chat.post_id : String(chat.post_id || ''),
            creator_id: typeof chat.creator_id === 'string' ? chat.creator_id : String(chat.creator_id || ''),
            claimer_id: typeof chat.claimer_id === 'string' ? chat.claimer_id : String(chat.claimer_id || ''),
            last_message: messagesData && messagesData[0] && typeof messagesData[0].content === 'string' 
              ? messagesData[0].content 
              : undefined,
            last_message_time: messagesData && messagesData[0] && typeof messagesData[0].created_at === 'string' 
              ? messagesData[0].created_at 
              : undefined,
            post: {
              id: postData.id || '',
              title: postData.title || 'Unknown Post',
              image_url: postData.image_url || '',
              description: postData.description || '',
              created_at: postData.created_at || new Date().toISOString()
            },
            creator: {
              first_name: creatorData.first_name || 'Unknown',
              last_name: creatorData.last_name || ''
            },
            claimer: {
              first_name: claimerData.first_name || 'Unknown',
              last_name: claimerData.last_name || ''
            }
          };
          
          return result;
        })
      );

      setChats(chatsWithMessages);
    } catch (error) {
      console.error('Error in fetchChats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChats()
  }, [])

  if (loading) {
    return (
      <div className="p-4 text-center">
        <p>Loading chats...</p>
      </div>
    )
  }

  return (
    <div className="h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Messages</h2>
      </div>
      <div className="overflow-y-auto h-[calc(100%-57px)]">
        {chats.map((chat) => {
          const isCreator = chat.creator_id === currentUserId
          const otherUser = isCreator ? chat.claimer : chat.creator

          return (
            <a
              key={chat.id}
              href={`/chat/${chat.id}`}
              onClick={() => onClose?.()}
              className="flex items-start gap-3 p-4 hover:bg-gray-50 border-b transition-colors"
            >
              <div className="relative w-14 h-14 rounded-md overflow-hidden flex-shrink-0">
                <Image
                  src={chat.post.image_url}
                  alt={chat.post.title}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="text-sm font-medium line-clamp-1">
                      {chat.post.title || chat.post.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      with {otherUser.first_name} {otherUser.last_name}
                    </p>
                  </div>
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
          )
        })}
      </div>
    </div>
  )
}
