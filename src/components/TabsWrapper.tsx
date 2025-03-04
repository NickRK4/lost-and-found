'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PostList from './PostList'

export default function TabsWrapper() {
  return (
    <Tabs defaultValue="24h" className="w-full">
      <TabsList className="mb-6 w-full justify-start overflow-x-auto">
        <TabsTrigger value="24h">Last 24 Hours</TabsTrigger>
        <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
        <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
      </TabsList>
      <TabsContent value="24h">
        <PostList timeFrame="24h" />
      </TabsContent>
      <TabsContent value="7d">
        <PostList timeFrame="7d" />
      </TabsContent>
      <TabsContent value="30d">
        <PostList timeFrame="30d" />
      </TabsContent>
    </Tabs>
  )
}
