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
        <main className="min-h-screen bg-background text-foreground selection:bg-primary/20">
          {children}
        </main>
        <Toaster />
      </>
    );
  }

  return (
    <SidebarProvider>
      <NotificationProvider>
        <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans selection:bg-primary/20">

          {/* Sidebar Loading Fallback matches sidebar bg */}
          <Suspense fallback={<div className="hidden h-screen bg-sidebar lg:block lg:w-64 lg:flex-shrink-0" />}>
            <Sidebar />
          </Suspense>

          <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="relative z-10 flex h-full flex-col">
              <Header />
              <main className="flex-1 overflow-y-auto scroll-smooth">
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
