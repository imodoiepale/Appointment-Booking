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
      <div className="flex h-screen overflow-hidden bg-slate-100 text-slate-950">
        <Suspense fallback={<div className="hidden lg:block lg:w-68 lg:flex-shrink-0 bg-white border-r border-slate-200 h-screen" />}>
          <Sidebar />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(13,170,138,0.10),transparent_32%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </NotificationProvider>
  );
}
