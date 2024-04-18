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
        <nav className=" pl-3 md:pl-4  border-gray-600  w-14 md:w-auto items-center">
            <ul className='flex justify-start my-6 items-center'>
                <div className='flex items-center'>
                <ul className='flex space-x-2 '>
                    {links.map(links =>
                    <Link
                        key={links.href}
                        href={links.href}
                        className={`py-2 px-4 items-center text-sm md:text-md font-bold rounded ${links.href === currentPath ? 'bg-zinc-500 text-white' : 'text-zinc-600 bg-zinc-200 hover:text-zinc-800 hover:shadow-lg'}`}
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