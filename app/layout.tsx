// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Inter, Poppins } from 'next/font/google'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import Header from '../components/Header'
import { ThemeProvider } from "@/components/theme-provider"
import Sidebar from '@/components/Sidebar'
import { NotificationProvider } from '@/context/NotificationContext'

// Using Inter for a clean, modern look like in the reference design
const inter = Inter({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  applicationName: 'BCL APPOINTMENTS',
  manifest: "/manifest.json",
  title: 'BCL APPOINTMENTS',
  description: 'Streamlined appointment scheduling for professionals',
  keywords: ['appointments', 'meeting scheduler', 'professional calendar'],
}

export const viewport: Viewport = {
  themeColor: "#10B1AE",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans antialiased bg-gray-100`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <NotificationProvider>
              <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex-1">
                  <Header />
                  <main className="p-6">
                    {children}
                  </main>
                </div>
              </div>
            </NotificationProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}