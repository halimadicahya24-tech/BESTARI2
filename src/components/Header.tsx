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
    <header className="flex items-center justify-between px-4 py-3 bg-[#EFF4F2] border-b border-[#D8E4E0] sticky top-0 z-30 shadow-sm">
      {/* Menu Drawer Toggle */}
      <button 
        onClick={onOpenMenu}
        aria-label="Open Menu"
        className="p-2 text-[#1E4852] hover:bg-[#DCE7E3] rounded-lg transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Brand Logo & Title + Connection Badge */}
      <div className="flex flex-col items-center">
        {title ? (
          <h1 className="text-xl font-bold text-[#1E4852] tracking-tight">{title}</h1>
        ) : (
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="BESTARI Logo" className="w-7 h-7 object-contain" />
            <span className="text-lg font-extrabold text-[#1E4852] tracking-wider uppercase">
              BESTARI
            </span>
          </div>
        )}

        {/* Connectivity Mode Badge */}
        <div className={`mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide transition-all ${
          isConnected 
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
            : 'bg-amber-100 text-amber-800 border border-amber-300'
        }`}>
          {isConnected ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi className="w-2.5 h-2.5" />
              ESP32 Connected
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
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
        className="relative p-2 text-[#1E4852] hover:bg-[#DCE7E3] rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#D9534F] rounded-full ring-2 ring-[#EFF4F2] animate-pulse" />
        )}
      </button>
    </header>
  );
};

