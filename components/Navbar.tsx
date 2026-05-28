"use client"
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const Navbar = () => {
    const currentPath = usePathname();

    const links = [
        { label: "Overview", href: "/dashboard" },
        { label: "Schedule", href: "/schedule" },
        { label: "Activity", href: "/activity" }, // Optional additional tab
    ]

    return (
        <nav className="flex items-end h-14 px-4 md:px-8 border-b border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm transition-colors">
            <div className="flex gap-6 -mb-px">
                {links.map(link => {
                    const isActive = link.href === currentPath;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`pb-3 text-sm font-medium transition-all border-b-2 ${isActive
                                ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
                                : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:border-zinc-700'
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