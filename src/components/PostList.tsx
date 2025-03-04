'use client'

import { Post } from '@/types/database'
import PostCard from './PostCard'
import { supabase } from '@/lib/supabase'
import { subDays } from 'date-fns'
import { useEffect, useState } from 'react'

interface PostListProps {
  timeFrame: '24h' | '7d' | '30d'
}

export default function PostList({ timeFrame }: PostListProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true)
        const now = new Date()
        const daysMap = {
          '24h': 1,
          '7d': 7,
          '30d': 30,
        }
        
        const startDate = subDays(now, daysMap[timeFrame])

        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false })

        if (error) throw error

        setPosts(data || [])
      } catch (err) {
        console.error('Error fetching posts:', err)
        setError('Failed to load posts')
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [timeFrame])

  if (loading) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Loading posts...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">No posts found for this time period</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
