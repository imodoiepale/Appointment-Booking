"use client"
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const Navbar = () => {
    const currentPath = usePathname();

    const links = [
        { label: "Overview", href: "/dashboard" },
        { label: "Schedule", href: "/schedule" },
    ]

    return (
        <nav className="flex items-center h-16 px-4 md:px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617] transition-colors">
            <div className="flex items-center space-x-1">
                {links.map(link => {
                    const isActive = link.href === currentPath;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`py-1.5 px-4 text-sm font-bold rounded-lg transition-all ${isActive
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
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