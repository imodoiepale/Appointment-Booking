import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import Header from '../components/Header'
import { ThemeProvider } from "@/components/theme-provider"
import Navbar from '@/components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  applicationName:'BCL APPOINTMENTS',
  manifest:"/manifest.json",
  title: 'BCL APPOINTMENTS',
  description: 'APPOINTMENT SCHEDULER',
}
export const viewport: Viewport = {
  themeColor: "#10B1AE",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            
          <div className='mx-auto max-w-7xl text-md gap-2 mb-1'>
            <Header/>
            <Navbar />
            {children}
          </div>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
