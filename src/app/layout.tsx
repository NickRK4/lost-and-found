'use client'

import { Toaster } from 'react-hot-toast'
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from '@/components/Navbar'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const geist = Geist({ subsets: ["latin"] });
const geist_mono = Geist_Mono({
  subsets: ["latin"],
});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname()
  
  // Don't show navbar on auth page, homepage, or about page
  const showNavbar = !pathname.includes('/auth') && pathname !== '/' && pathname !== '/home' && pathname !== '/about'
  
  // Determine which menu item is active
  const isHomePage = pathname === '/' || pathname === '/home'
  const isAboutPage = pathname === '/about'
  const isAuthPage = pathname.includes('/auth')
  
  return (
    <html lang="en">
      <body
        className={`${geist.className} ${geist_mono.className}`}
      >
        {/* Simple menu for homepage, about page, and auth page */}
        {(isHomePage || isAboutPage || isAuthPage) && (
          <div className="absolute top-0 right-0 p-4 flex space-x-6 z-10">
            <Link 
              href="/home" 
              className={`text-sm font-medium ${isHomePage ? 'border-b-2 border-[#57068B]' : ''}`}
            >
              Home
            </Link>
            <Link 
              href="/about" 
              className={`text-sm font-medium ${isAboutPage ? 'border-b-2 border-[#57068B]' : ''}`}
            >
              About
            </Link>
            <Link 
              href="/auth" 
              className={`text-sm font-medium ${isAuthPage ? 'border-b-2 border-[#57068B]' : ''}`}
            >
              Sign Up
            </Link>
          </div>
        )}
        
        {showNavbar && <Navbar />}
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
