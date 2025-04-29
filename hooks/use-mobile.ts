"use client"

import { useEffect, useState } from "react"

/**
 * A hook that returns whether the current viewport is mobile-sized
 * @param breakpoint The breakpoint to consider as mobile (default: 768px)
 * @returns boolean indicating if the viewport is mobile-sized
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check on mount
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }
    
    // Initial check
    checkIfMobile()
    
    // Add event listener for resize
    window.addEventListener("resize", checkIfMobile)
    
    // Clean up
    return () => {
      window.removeEventListener("resize", checkIfMobile)
    }
  }, [breakpoint])

  return isMobile
}
