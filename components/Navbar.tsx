"use client"
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'


const Navbar = () => {

    const currentPath = usePathname();

    console.log(currentPath)

    const links = [
        {label: "Dashboard", href: "/"},
        {label: "Schedule Appointment", href: "/schedule"},
    ]

    return (
        <nav >
            <ul className='flex justify-between my-10 items-center'>
                <div>
                    <ul className='flex space-x-6'>
                {links.map(links =>
                    <Link
                        key={links.href}
                        href={links.href}
                        className={ ` ${links.href=== currentPath ? 'text-zinc-500' : ' text-zinc-600' } hover:text-zinc-800 `}
                    >{links.label}</Link>
                )}
            </ul>
                </div>
            </ul>
        </nav>
    )
}

export default Navbar