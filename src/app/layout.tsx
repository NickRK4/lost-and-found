import { Toaster } from 'react-hot-toast'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from '@/components/Navbar'

const geist = Geist({ subsets: ["latin"] });
const geist_mono = Geist_Mono({
  subsets: ["latin"],
});

const metadata: Metadata = {
  title: 'Lost and Found',
  description: 'Share and find lost items in your community',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geist.className} ${geist_mono.className}`}
      >
        <Navbar />
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
