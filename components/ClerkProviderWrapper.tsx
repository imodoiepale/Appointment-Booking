'use client'

import { ClerkProvider } from '@clerk/nextjs'

interface ClerkProviderWrapperProps {
  children: React.ReactNode
}

export default function ClerkProviderWrapper({ children }: ClerkProviderWrapperProps) {
  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  )
}
