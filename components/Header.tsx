// @ts-nocheck
"use client"

import { useState } from 'react';
import { Search, User, ChevronDown } from 'lucide-react';
// import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from './NotificationSystem';

export default function Header() {
  // const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30 w-full">
      <div className="flex items-center justify-between w-full max-w-full">
        <div className="flex items-center flex-1 lg:flex-initial lg:w-72 min-w-0">
          <div className="relative w-full lg:w-auto lg:mr-4 min-w-0">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full lg:w-64 pl-10 pr-4 py-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent min-w-0"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4 flex-shrink-0">
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg p-2 transition-colors">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                  <User size={16} />
                </div>
                <div className="hidden md:block text-left min-w-0">
                  <p className="text-sm font-medium text-gray-700">{'User Name'}</p>
                  <p className="text-xs text-gray-500">{'email@example.com'}</p>
                </div>
                <ChevronDown size={16} className="text-gray-500 flex-shrink-0" />
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