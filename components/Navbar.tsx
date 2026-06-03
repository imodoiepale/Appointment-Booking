// @ts-nocheck
"use client"

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const currentPath = usePathname();

  const links = [
    { label: "Today", href: "/dashboard" },
    { label: "Customers", href: "/customers" },
    { label: "Sales Hub", href: "/sales-hub" },
    { label: "Orders & Billing", href: "/billing" },
    { label: "Health & Operations", href: "/operations" },
  ];

  return (
    <nav className="flex h-16 items-center border-b border-slate-200 bg-white px-8">
      <div className="flex items-center gap-1">
        {links.map((link) => {
          const isActive = link.href === currentPath;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-5 py-2 text-sm font-medium transition-all duration-200",
                // Matches the "Sales Hub" tab style in the image
                isActive 
                  ? "rounded-md bg-slate-100 text-[#0057E7]" 
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Navbar;