'use client';

import React from 'react';
import { Menu, Bell, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  title?: string;
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
  unreadCount?: number;
  isConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onOpenMenu,
  onOpenNotifications,
  unreadCount = 2,
  isConnected = false
}) => {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-[#F8FAF9] border-b border-[#E1E3E2] sticky top-0 z-30 shadow-xs">
      {/* Menu Drawer Toggle */}
      <button 
        onClick={onOpenMenu}
        aria-label="Open Menu"
        className="p-2 text-[#163F4C] hover:bg-[#ECEEED] rounded-lg transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Brand Logo & Title + Connection Badge */}
      <div className="flex flex-col items-center">
        {title ? (
          <h1 className="text-lg font-extrabold text-[#163F4C] tracking-tight font-hanken">{title}</h1>
        ) : (
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="BESTARI Logo" className="w-7 h-7 object-contain" />
            <span className="text-lg font-extrabold text-[#163F4C] tracking-wider font-hanken">
              BESTARI
            </span>
          </div>
        )}

        {/* Connectivity Mode Badge */}
        <div className={`mt-0.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide transition-all ${
          isConnected 
            ? 'bg-[#B8EAD7] text-[#1F4F41] border border-[#9FD1BF]' 
            : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
        }`}>
          {isConnected ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#386758] animate-pulse" />
              <Wifi className="w-2.5 h-2.5" />
              ESP32 Connected
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
              <WifiOff className="w-2.5 h-2.5" />
              Mode Demo / Standalone
            </>
          )}
        </div>
      </div>

      {/* Notifications Button */}
      <button 
        onClick={onOpenNotifications}
        aria-label="Notifications"
        className="relative p-2 text-[#163F4C] hover:bg-[#ECEEED] rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#BA1A1A] rounded-full ring-2 ring-[#F8FAF9] animate-pulse" />
        )}
      </button>
    </header>
  );
};
