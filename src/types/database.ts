export interface Post {
  id: string
  user_id: string
  image_url: string
  description: string
  location: string
  created_at: string
  title?: string
  first_name?: string
  last_name?: string
  status?: 'active' | 'claimed' | 'resolved'
}

export interface Chat {
  id: string
  post_id: string
  sender_id: string
  receiver_id: string
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string
  created_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string
}
