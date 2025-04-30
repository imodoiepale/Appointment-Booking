// @ts-nocheck
"use client"

import { useState } from 'react';
import { Search, User, ChevronDown } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from './NotificationBell';

export default function Header() {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="bg-white border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center md:w-72">
          <div className="relative flex-1 md:mr-4">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center">
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center space-x-2 ml-4">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {user?.imageUrl ? (
                    <Image 
                      src={user.imageUrl} 
                      alt={user?.fullName || 'User'} 
                      width={32} 
                      height={32}
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <User size={16} />
                  )}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-700">{user?.fullName || 'User Name'}</p>
                  <p className="text-xs text-gray-500">{user?.primaryEmailAddress?.emailAddress || 'email@example.com'}</p>
                </div>
                <ChevronDown size={16} className="text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}