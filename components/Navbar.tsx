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
        <nav className="shadow-md w-auto">
            <ul className='flex justify-start my-6 items-center'>
                <div>
                <ul className='flex space-x-2'>
                    {links.map(links =>
                    <Link
                        key={links.href}
                        href={links.href}
                        className={`py-2 px-4 font-bold rounded ${links.href === currentPath ? 'bg-zinc-500 text-white' : 'text-zinc-600 hover:text-zinc-800 hover:shadow-lg'}`}
                    >
                        {links.label}
                    </Link>
                    )}
                </ul>
                </div>
            </ul>
        </nav>


    )
}

export default Navbar