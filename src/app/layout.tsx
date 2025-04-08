'use client'

import { Toaster } from 'react-hot-toast'
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from '@/components/Navbar'
import { usePathname } from 'next/navigation'

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
  
  return (
    <html lang="en">
      <body
        className={`${geist.className} ${geist_mono.className}`}
      >
        {showNavbar && <Navbar />}
        <main className="min-h-screen">
          {children}
        </main>
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
