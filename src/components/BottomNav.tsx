'use client';

import React from 'react';
import { Home, Bot, History, Settings } from 'lucide-react';

export type TabType = 'home' | 'drtani' | 'history' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'home' as TabType, label: 'Beranda', icon: Home },
    { id: 'drtani' as TabType, label: 'Dr. Tani AI', icon: Bot },
    { id: 'history' as TabType, label: 'Riwayat', icon: History },
    { id: 'settings' as TabType, label: 'Pengaturan', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#F8FAF9]/95 backdrop-blur-md border-t border-[#E1E3E2] px-3 py-2 flex justify-around items-center z-40 shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 ${
              isActive
                ? 'bg-[#305664] text-white font-bold shadow-xs'
                : 'text-[#41484B] hover:text-[#163F4C] hover:bg-[#ECEEED]'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-[11px] mt-0.5">{item.label}</span>
            {isActive && (
              <span className="w-1 h-1 rounded-full bg-[#A3CADA] mt-0.5 animate-pulse" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
