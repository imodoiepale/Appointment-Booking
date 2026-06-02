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
    <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center border-b border-border bg-background/80 px-4 backdrop-blur-md transition-colors md:px-6">
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="flex h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground lg:hidden"
            aria-label="Toggle navigation"
          >
            {isMobileOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
          </Button>

          <div className="group relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search anything..."
              className="h-9 bg-secondary/70 pl-9 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
              <span className="flex h-5 items-center justify-center rounded border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground">
                Ctrl K
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" aria-label="Open applications">
            <LayoutGrid className="h-[18px] w-[18px]" />
          </Button>

          <div className="flex h-9 w-9 items-center justify-center">
            <NotificationBell />
          </div>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 hover:bg-transparent" aria-label="Open user menu">
                <Avatar className="h-8 w-8 ring-2 ring-transparent transition-all hover:ring-ring/20">
                  <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 border-border bg-popover p-1.5 text-popover-foreground shadow-xl">
              <DropdownMenuLabel className="px-2 py-2.5">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-foreground">{user?.displayName || "Enterprise User"}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email || "admin@bcl-portal.com"}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="mb-1" />

              <DropdownMenuItem className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm">
                <User className="h-[15px] w-[15px]" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-destructive transition-colors focus:bg-destructive/10 focus:text-destructive"
              >
                {isSigningOut ? <Loader2 className="h-[15px] w-[15px] animate-spin" /> : <LogOut className="h-[15px] w-[15px]" />}
                {isSigningOut ? "Signing Out..." : "Sign Out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isSigningOut && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-8 text-card-foreground shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Securely signing out...</p>
          </div>
        </div>
      )}
    </header>
  );
}
