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
        <main className="min-h-screen">{children}</main>
        <Toaster />
      </>
    );
  }

  return (
    <NotificationProvider>
      <div className="premium-dashboard-bg flex h-screen overflow-hidden text-slate-950">
        <Suspense fallback={<div className="hidden h-screen border-r border-slate-200/80 bg-white/90 lg:block lg:w-68 lg:flex-shrink-0" />}>
          <Sidebar />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </NotificationProvider>
  );
}
