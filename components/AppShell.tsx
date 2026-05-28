// @ts-nocheck
"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { NotificationProvider } from "@/components/NotificationSystem";
import { Toaster } from "@/components/ui/toaster";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === "/login" || pathname === "/" || pathname === "/privacy" || pathname === "/terms";

  if (isPublicPage) {
    return (
      <>
        <main className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50">{children}</main>
        <Toaster />
      </>
    );
  }

  return (
    <NotificationProvider>
      <div className="flex h-screen overflow-hidden bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800">

        {/* Sidebar Loading Fallback */}
        <Suspense fallback={<div className="hidden h-screen border-r border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950/50 lg:block lg:w-64 lg:flex-shrink-0" />}>
          <Sidebar />
        </Suspense>

        {/* Main Application Area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/50">
            {children}
          </main>
        </div>

      </div>
      <Toaster />
    </NotificationProvider>
  );
}