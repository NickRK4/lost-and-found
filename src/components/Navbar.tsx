'use client'

import Link from 'next/link'
import { MessageCircle, Menu } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark')
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    }
  }, [])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    const newTheme = !darkMode ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', !darkMode)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <nav className="border-b bg-white dark:bg-gray-800">
      <style jsx>{`
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>

      {/* Mobile menu button */}
      <button
        className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Dark mode switch */}
      <button
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
        onClick={toggleDarkMode}
      >
        {darkMode ? 'Light Mode' : 'Dark Mode'}
      </button>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/chats"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Messages
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
