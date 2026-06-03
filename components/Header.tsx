// @ts-nocheck
"use client"

import { useEffect, useState } from "react";
import { LayoutGrid, Loader2, LogOut, Menu, Search, User, X } from "lucide-react";

import { useSidebar } from "@/contexts/SidebarContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { NotificationBell } from "./NotificationSystem";

export default function Header() {
  const { isMobileOpen, setIsMobileOpen } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data.authenticated && data.user) setUser(data.user);
      } catch {
        setUser(null);
      }
    }
    fetchUser();
  }, []);

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      setIsSigningOut(false);
    }
  };

  const initials = (user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md transition-colors md:px-8">
      <div className="flex w-full items-center justify-between gap-8">
        <div className="flex flex-1 items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="flex h-9 w-9 shrink-0 text-slate-500 hover:text-slate-900 lg:hidden"
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Search Bar - Matches the Image style (Wide, Rounded-Full) */}
          <div className="group relative w-full max-w-2xl">
            <Input
              type="text"
              placeholder="Search"
              className="h-10 w-full rounded-full border-slate-200 bg-white pr-10 text-sm shadow-sm transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-500/5 placeholder:text-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:bg-slate-100" aria-label="Apps">
            <LayoutGrid className="h-5 w-5" />
          </Button>

          <NotificationBell />

          <Separator orientation="vertical" className="mx-1 h-6 bg-slate-200" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                  <AvatarFallback className="bg-[#0057E7] text-[11px] font-bold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 p-2 shadow-2xl">
              <DropdownMenuLabel className="px-2 py-2">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold text-slate-900">{user?.displayName || "Enterprise User"}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email || "admin@bcl-portal.com"}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer gap-2 py-2 text-slate-600">
                <User className="h-4 w-4" /> Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer gap-2 py-2 font-medium text-red-600 focus:bg-red-50 focus:text-red-600">
                <LogOut className="h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}