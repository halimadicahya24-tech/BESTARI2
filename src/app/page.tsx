'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { BottomNav, TabType } from '../components/BottomNav';
import { LoginScreen } from '../components/LoginScreen';
import { DashboardScreen } from '../components/DashboardScreen';
import { HistoryScreen } from '../components/HistoryScreen';
import { SettingsScreen } from '../components/SettingsScreen';
import { VisualLogModal } from '../components/VisualLogModal';
import { HardwarePinoutModal } from '../components/HardwarePinoutModal';
import { initialSystemStatus, initialVisualLogs } from '../lib/mockData';
import { SystemStatusResponse, VisualLog } from '../lib/types';
import { fetchLatestStatus } from '../lib/api';
import { X, Sparkles, AlertCircle, Info, ShieldCheck } from 'lucide-react';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse>(initialSystemStatus);
  const [visualLogs, setVisualLogs] = useState<VisualLog[]>(initialVisualLogs);
  const [selectedLog, setSelectedLog] = useState<VisualLog | null>(null);
  const [isPinoutModalOpen, setIsPinoutModalOpen] = useState<boolean>(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [showMenuDrawer, setShowMenuDrawer] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Periodic polling for ESP32/Flask API backend live status
  useEffect(() => {
    if (!isLoggedIn) return;

    const checkStatus = async () => {
      const res = await fetchLatestStatus();
      if (res.isLive) {
        setSystemStatus(res.data);
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    };

    checkStatus();
    const intervalId = setInterval(checkStatus, 4000);
    return () => clearInterval(intervalId);
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="relative min-h-full flex flex-col bg-[#EFF4F2]">
      {/* Top Navigation Header */}
      <Header
        title={activeTab === 'history' ? 'History' : activeTab === 'settings' ? 'Settings' : undefined}
        onOpenMenu={() => setShowMenuDrawer(true)}
        onOpenNotifications={() => setShowNotificationsModal(true)}
        unreadCount={2}
        isConnected={isConnected}
      />


      {/* Main Tab Screens */}
      <div className="flex-1">
        {activeTab === 'home' && (
          <DashboardScreen
            systemStatus={systemStatus}
            setSystemStatus={setSystemStatus}
            onOpenPinoutModal={() => setIsPinoutModalOpen(true)}
          />
        )}

        {activeTab === 'history' && (
          <HistoryScreen
            visualLogs={visualLogs}
            onSelectLog={(log) => setSelectedLog(log)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            onLogout={() => setIsLoggedIn(false)}
            onOpenPinouts={() => setIsPinoutModalOpen(true)}
          />
        )}
      </div>

      {/* Bottom Floating Navigation Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Visual Inspection Modal */}
      <VisualLogModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />

      {/* Hardware Pinouts Modal */}
      <HardwarePinoutModal
        isOpen={isPinoutModalOpen}
        onClose={() => setIsPinoutModalOpen(false)}
      />

      {/* Notifications Drawer Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 pt-16">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 space-y-3 shadow-2xl animate-fade-in border border-[#D8E4E0]">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5ECE9]">
              <h3 className="font-extrabold text-sm text-[#1E4852] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#2A5B64]" />
                Notifikasi System BESTARI
              </h3>
              <button onClick={() => setShowNotificationsModal(false)}>
                <X className="w-4 h-4 text-[#6B878C]" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-[#FDE8E8] text-[#D9534F] rounded-xl font-medium border border-red-200">
                <div className="font-bold flex items-center gap-1 mb-1">
                  <AlertCircle className="w-4 h-4" /> Deteksi Hama Grayak (Cam 1)
                </div>
                ESP32-CAM memicu penyemprotan otomatis Beauveria bassiana selama 3 detik pada 10:30 AM.
              </div>
              <div className="p-3 bg-[#D9F7EC] text-[#1E4852] rounded-xl font-medium border border-emerald-200">
                <div className="font-bold flex items-center gap-1 text-[#2D8A68] mb-1">
                  <ShieldCheck className="w-4 h-4" /> Telemetri Sensor Terkirim
                </div>
                Suhu 24°C, Sisa biopestisida 85% (5L Capacity).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Left Menu Drawer */}
      {showMenuDrawer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex">
          <div className="bg-[#1E4852] text-white w-4/5 max-w-xs h-full p-5 space-y-6 flex flex-col justify-between shadow-2xl animate-fade-in">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="BESTARI Logo" className="w-8 h-8 object-contain" />
                  <div>
                    <h2 className="font-extrabold text-base tracking-wider">BESTARI</h2>
                    <p className="text-[10px] text-[#A8E6CF]">Samsung Solve for Tomorrow</p>
                  </div>
                </div>
                <button onClick={() => setShowMenuDrawer(false)}>
                  <X className="w-5 h-5 text-white/80" />
                </button>
              </div>

              <div className="space-y-2 text-sm font-semibold">
                <button
                  onClick={() => { setActiveTab('home'); setShowMenuDrawer(false); }}
                  className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-white/10 flex items-center gap-3"
                >
                  🏡 Home Dashboard
                </button>
                <button
                  onClick={() => { setActiveTab('history'); setShowMenuDrawer(false); }}
                  className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-white/10 flex items-center gap-3"
                >
                  📊 Histori & Analitik
                </button>
                <button
                  onClick={() => { setActiveTab('settings'); setShowMenuDrawer(false); }}
                  className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-white/10 flex items-center gap-3"
                >
                  ⚙️ System & Hardware Config
                </button>
                <button
                  onClick={() => { setIsPinoutModalOpen(true); setShowMenuDrawer(false); }}
                  className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-white/10 flex items-center gap-3"
                >
                  🔌 ESP32-CAM Pinouts (GPIO 14)
                </button>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 text-center text-xs text-[#A8E6CF]">
              <p className="font-bold">BESTARI v2.0.0</p>
              <p className="text-[10px] opacity-75">SMAN Sumatera Selatan</p>
            </div>
          </div>
          <div className="flex-1" onClick={() => setShowMenuDrawer(false)} />
        </div>
      )}
    </div>
  );
}
