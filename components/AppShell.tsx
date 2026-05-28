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
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-50 selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900/40 dark:selection:text-blue-100">
          {children}
        </main>
        <Toaster />
      </>
    );
  }

  return (
    <NotificationProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900/40 dark:selection:text-blue-100">

        {/* Sidebar Loading Fallback */}
        <Suspense fallback={<div className="hidden h-screen border-r border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-950 lg:block lg:w-64 lg:flex-shrink-0" />}>
          <Sidebar />
        </Suspense>

        {/* Main Application Area */}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">

          {/* Subtle Ambient Background Glow */}
          <div className="pointer-events-none absolute -top-40 right-0 z-0 h-[600px] w-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-100/50 via-transparent to-transparent opacity-60 blur-3xl dark:from-blue-900/20" />
          <div className="pointer-events-none absolute -left-20 top-40 z-0 h-[400px] w-[400px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-100/40 via-transparent to-transparent opacity-50 blur-3xl dark:from-indigo-900/10" />

          {/* Content Wrapper */}
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
  );
}