"use client"
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const Navbar = () => {
    const currentPath = usePathname();

    const links = [
        { label: "Overview", href: "/dashboard" },
        { label: "Schedule", href: "/schedule" },
        { label: "Activity", href: "/activity" },
    ]

    return (
        <nav className="flex items-end h-14 px-4 md:px-8 border-b border-zinc-200 dark:border-white/5 bg-white/50 dark:bg-[#001a1e]/50 backdrop-blur-sm transition-colors">
            <div className="flex gap-6 -mb-px">
                {links.map(link => {
                    const isActive = link.href === currentPath;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`pb-3 text-sm font-medium transition-all border-b-2 ${isActive
                                /* UPDATED TO SIDEBAR CYAN ACCENT */
                                ? 'border-[#00d1d1] text-[#00d1d1] dark:border-[#00d1d1] dark:text-[#00d1d1]'
                                : 'border-transparent text-zinc-500 hover:text-[#003038] hover:border-zinc-300 dark:text-[#a3c6cc] dark:hover:text-white dark:hover:border-white/20'
                                }`}
                        >
                            {link.label}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}

export default Navbar;