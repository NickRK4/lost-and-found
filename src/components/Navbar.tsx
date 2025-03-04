'use client'

import Link from 'next/link'
import { MessageCircle, Menu } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()

  return (
    <nav className="border-b bg-white">
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
        className="md:hidden p-2 hover:bg-gray-100 rounded-full"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/chats"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
            >
              Messages
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
