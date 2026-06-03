// @ts-nocheck
"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { NotificationProvider } from "@/components/NotificationSystem";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/contexts/SidebarContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === "/login" || pathname === "/" || pathname === "/privacy" || pathname === "/terms";

  if (isPublicPage) {
    return (
      <>
        <main className="min-h-screen bg-background text-foreground selection:bg-primary/30">
          {children}
        </main>
        <Toaster />
      </>
    );
  }

  return (
    <SidebarProvider>
      <NotificationProvider>
        {/* selection:bg-primary/20 changed to brand blue selection */}
        <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans selection:bg-[#0057E7]/20">

          {/* Sidebar Loading Fallback matches the new Sidebar Background #061D43 */}
          <Suspense fallback={<div className="hidden h-screen bg-[#061D43] lg:block lg:w-[260px] lg:flex-shrink-0" />}>
            <Sidebar />
          </Suspense>

          <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="relative z-10 flex h-full flex-col">
              <Header />
              <main className="flex-1 overflow-y-auto scroll-smooth bg-[#F8FAFC]">
                {children}
              </main>
            </div>
          </div>

        </div>
        <Toaster />
      </NotificationProvider>
    </SidebarProvider>
  );
}