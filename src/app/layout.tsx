import { Toaster } from 'react-hot-toast'
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from '@/components/Navbar'

const geist = Geist({ subsets: ["latin"] });
const geist_mono = Geist_Mono({
  subsets: ["latin"],
});


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
