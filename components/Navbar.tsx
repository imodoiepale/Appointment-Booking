"use client"

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

const Navbar = () => {
  const currentPath = usePathname();

  const links = [
    { label: "Overview", href: "/dashboard" },
    { label: "Schedule", href: "/schedule" },
    { label: "Activity", href: "/activity" },
  ];

  return (
    <nav className="flex h-14 items-end border-b border-border bg-background/50 px-4 backdrop-blur-sm transition-colors md:px-8">
      <NavigationMenu className="max-w-none justify-start">
        <NavigationMenuList className="-mb-px justify-start gap-6 space-x-0">
          {links.map((link) => {
            const isActive = link.href === currentPath;

            return (
              <NavigationMenuItem key={link.href}>
                <NavigationMenuLink asChild>
                  <Link
                    href={link.href}
                    className={cn(
                      "block border-b-2 border-transparent pb-3 text-sm font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground",
                      isActive && "border-primary text-primary"
                    )}
                  >
                    {link.label}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            );
          })}
        </NavigationMenuList>
      </NavigationMenu>
    </nav>
  );
};

export default Navbar;
