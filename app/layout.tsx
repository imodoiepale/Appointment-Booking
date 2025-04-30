// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Inter, Poppins } from 'next/font/google'
import './globals.css'
// import { ClerkProvider } from '@clerk/nextjs'
// import { ThemeProvider } from '@/components/theme-provider'
// import { NotificationProvider } from '@/context/NotificationContext'
// import { Toaster } from '@/components/ui/toaster'

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

// TEMPORARY: MINIMAL LAYOUT FOR DEBUGGING SSR ERROR
// Comment out all providers except main content to isolate the error source

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {/* <ClerkProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <NotificationProvider>
              <div className="flex min-h-screen">
                {/* <Sidebar /> */}
                {/* <div className="flex-1">
                  {/* <Header /> */}
                  {/* <main className="p-6">
                    {children}
                  </main>
                </div> 
              </div>
              {/* <Toaster /> */}
            {/* </NotificationProvider>
          </ThemeProvider>
        </ClerkProvider> */}
        <main>{children}</main>
      </body>
    </html>
  )
}