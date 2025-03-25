'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MainPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the home page
    router.push('/home')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-200">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#57068B] mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white transition-colors duration-200">Loading...</h2>
        <p className="text-gray-500 dark:text-gray-300 transition-colors duration-200">Please wait while we redirect you.</p>
      </div>
    </div>
  )
}
