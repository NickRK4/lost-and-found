'use client'

import { Suspense } from 'react'
import ChatSidebar from './ChatSidebar'
import TabsWrapper from './TabsWrapper'

export default function ClientLayout() {
  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Chat sidebar - hidden on mobile */}
      <aside className="w-80 border-r bg-white hidden md:block">
        <Suspense fallback={
          <div className="p-4">
            <p className="text-gray-500">Loading chats...</p>
          </div>
        }>
          <ChatSidebar />
        </Suspense>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto flex justify-center">
        <div className="w-full max-w-2xl px-4 py-6">
          <Suspense fallback={
            <div className="text-center py-10">
              <p className="text-gray-500">Loading posts...</p>
            </div>
          }>
            <TabsWrapper />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
