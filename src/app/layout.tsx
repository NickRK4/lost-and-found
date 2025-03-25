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
  
  // Don't show navbar on auth page
  const showNavbar = !pathname.includes('/auth')
  
  return (
    <html lang="en">
      <body
        className={`${geist.className} ${geist_mono.className}`}
      >
        {showNavbar && <Navbar />}
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
