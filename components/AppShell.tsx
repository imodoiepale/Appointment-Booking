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
        <main className="min-h-screen bg-slate-50 dark:bg-[#001f24] text-slate-950 dark:text-white selection:bg-[#00d1d1]/20">
          {children}
        </main>
        <Toaster />
      </>
    );
  }

  return (
    <SidebarProvider>
      <NotificationProvider>
        <div className="flex h-screen overflow-hidden bg-white dark:bg-[#001f24] text-[#003038] dark:text-white font-sans selection:bg-[#00d1d1]/30">

          {/* Sidebar Loading Fallback matches sidebar bg */}
          <Suspense fallback={<div className="hidden h-screen bg-[#003038] lg:block lg:w-64 lg:flex-shrink-0" />}>
            <Sidebar />
          </Suspense>

          <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">

            {/* Cyan/Teal Ambient Background Glows */}
            <div className="pointer-events-none absolute -top-40 right-0 z-0 h-[600px] w-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-100/40 via-transparent to-transparent opacity-60 blur-3xl dark:from-[#00d1d1]/10" />
            <div className="pointer-events-none absolute -left-20 top-40 z-0 h-[400px] w-[400px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#003038]/20 via-transparent to-transparent opacity-50 blur-3xl dark:from-[#003038]/30" />

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