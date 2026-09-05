'use client';

import React, { useState } from 'react';
import { Cpu, Server, Sliders, ShieldCheck, LogOut, CheckCircle2, RefreshCw, Zap, BellRing } from 'lucide-react';

interface SettingsScreenProps {
  onLogout: () => void;
  onOpenPinouts: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLogout, onOpenPinouts }) => {
  const [apiUrl, setApiUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bestari_api_url') || 'http://localhost:5000';
    }
    return 'http://localhost:5000';
  });
  const [apiStatus, setApiStatus] = useState<'connected' | 'testing' | 'offline'>('offline');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [sprayDuration, setSprayDuration] = useState(3);
  const [confidenceThreshold, setConfidenceThreshold] = useState(50);
  const [autoSprayEnabled, setAutoSprayEnabled] = useState(true);
  const [agitateBeforeSpray, setAgitateBeforeSpray] = useState(true);

  const handleTestConnection = async () => {
    setApiStatus('testing');
    setFeedbackMessage('Mencoba terhubung...');
    
    // Save URL to localStorage first
    if (typeof window !== 'undefined') {
      localStorage.setItem('bestari_api_url', apiUrl.trim());
    }

    const { testApiConnection } = await import('../lib/api');
    const result = await testApiConnection(apiUrl);

    if (result.success) {
      setApiStatus('connected');
      setFeedbackMessage('✅ Terhubung! Data ESP32 akan ditampilkan secara live.');
    } else {
      setApiStatus('offline');
      setFeedbackMessage(`⚠️ ${result.message}`);
    }
  };

  return (
    <div className="pb-28 pt-3 px-4 max-w-md mx-auto space-y-4 font-sans bg-[#EFF4F2] min-h-screen">
      {/* Title */}
      <h2 className="text-xl font-extrabold text-[#1E4852] tracking-tight">System Settings & IoT Config</h2>

      {/* SECTION 1: HARDWARE & PINOUT SPECIFICATION */}
      <div className="bg-white rounded-2xl p-4 border border-[#D8E4E0] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#EFF4F2] flex items-center justify-center text-[#1E4852]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#1E4852]">ESP32-CAM Hardware Node</h3>
              <p className="text-[11px] text-[#6B878C] font-semibold">Relay & Agitator Pinout Mapping</p>
            </div>
          </div>
          <button
            onClick={onOpenPinouts}
            className="bg-[#2A5B64] hover:bg-[#1E4852] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
          >
            Pinout Schema
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
          <div className="bg-[#F7FAF9] p-2.5 rounded-xl border border-[#E5ECE9]">
            <span className="text-[10px] text-[#6B878C] font-sans font-bold block">RELAY PIN</span>
            <span className="text-[#1E4852] font-bold">GPIO 14 (Pump/Agitator)</span>
          </div>
          <div className="bg-[#F7FAF9] p-2.5 rounded-xl border border-[#E5ECE9]">
            <span className="text-[10px] text-[#6B878C] font-sans font-bold block">CAMERA CLOCK</span>
            <span className="text-[#1E4852] font-bold">XCLK GPIO 0</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: BACKEND API CONFIGURATION */}
      <div className="bg-white rounded-2xl p-4 border border-[#D8E4E0] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#EFF4F2] flex items-center justify-center text-[#1E4852]">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#1E4852]">Pencocokan API Flask ESP32</h3>
              <p className="text-[11px] text-[#6B878C] font-semibold">Konfigurasi IP/URL Server Live Data</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            apiStatus === 'connected' ? 'bg-[#D9F7EC] text-[#2D8A68]' : apiStatus === 'testing' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {apiStatus === 'testing' ? 'Testing...' : apiStatus === 'connected' ? '● Connected' : '○ Standalone / Offline'}
          </span>
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-[#6B878C] uppercase tracking-wider">
            URL / IP Address Flask ESP32
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://192.168.1.50:5000 atau https://api.anda.com"
              className="flex-1 bg-[#F7FAF9] border border-[#D8E4E0] rounded-xl px-3 py-2 text-xs font-mono text-[#1E4852] focus:outline-none focus:border-[#2A5B64]"
            />
            <button
              onClick={handleTestConnection}
              className="bg-[#2A5B64] hover:bg-[#1E4852] text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${apiStatus === 'testing' ? 'animate-spin' : ''}`} />
              <span>Tes ESP32</span>
            </button>
          </div>
          {feedbackMessage && (
            <p className={`text-[11px] font-medium mt-1 ${apiStatus === 'connected' ? 'text-emerald-600' : 'text-amber-700'}`}>
              {feedbackMessage}
            </p>
          )}
          <p className="text-[10px] text-[#6B878C]">
            💡 Masukkan IP Flask ESP32 lokal (misal: <code>http://192.168.1.100:5000</code>) atau domain cloud Anda. Jika belum terhubung, web akan otomatis menyajikan Mode Standalone.
          </p>
        </div>
      </div>


      {/* SECTION 3: AUTOMATION & SPRAY PARAMETERS */}
      <div className="bg-white rounded-2xl p-4 border border-[#D8E4E0] shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#EFF4F2] flex items-center justify-center text-[#1E4852]">
            <Sliders className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-extrabold text-[#1E4852]">Pesticide Control Settings</h3>
        </div>

        {/* Auto Spray Toggle */}
        <div className="flex items-center justify-between py-1 border-b border-[#E5ECE9]">
          <div>
            <span className="text-xs font-bold text-[#1E4852] block">Auto-Spray Execution</span>
            <span className="text-[10px] text-[#6B878C]">Trigger pump automatically on YOLOv8 warning</span>
          </div>
          <button
            onClick={() => setAutoSprayEnabled(!autoSprayEnabled)}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              autoSprayEnabled ? 'bg-[#2A5B64]' : 'bg-[#D0DDD8]'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
              autoSprayEnabled ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Agitator Dinamo Pre-mix Toggle */}
        <div className="flex items-center justify-between py-1 border-b border-[#E5ECE9]">
          <div>
            <span className="text-xs font-bold text-[#1E4852] block">Pre-spray Agitator Dinamo</span>
            <span className="text-[10px] text-[#6B878C]">Mix Beauveria spores before pumping</span>
          </div>
          <button
            onClick={() => setAgitateBeforeSpray(!agitateBeforeSpray)}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              agitateBeforeSpray ? 'bg-[#2A5B64]' : 'bg-[#D0DDD8]'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
              agitateBeforeSpray ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Spray Duration Slider */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-[#1E4852]">Spray Pulse Duration</span>
            <span className="text-[#2A5B64] font-mono">{sprayDuration} Seconds</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={sprayDuration}
            onChange={(e) => setSprayDuration(Number(e.target.value))}
            className="w-full accent-[#2A5B64]"
          />
          <div className="flex justify-between text-[10px] text-[#6B878C]">
            <span>1s (Pulse)</span>
            <span>10s (Heavy)</span>
          </div>
        </div>

        {/* Confidence Threshold Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-[#1E4852]">AI YOLOv8 Confidence Threshold</span>
            <span className="text-[#2A5B64] font-mono">{confidenceThreshold}%</span>
          </div>
          <input
            type="range"
            min={30}
            max={90}
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
            className="w-full accent-[#2A5B64]"
          />
          <div className="flex justify-between text-[10px] text-[#6B878C]">
            <span>30% (Sensitive)</span>
            <span>90% (Strict)</span>
          </div>
        </div>
      </div>

      {/* SECTION 4: USER & TEAM CREDIT */}
      <div className="bg-white rounded-2xl p-4 border border-[#D8E4E0] shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1E4852] text-[#A8E6CF] font-extrabold flex items-center justify-center text-sm shadow-sm">
            FM
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#1E4852]">Fajrin Al Majid (Ketua Tim)</h4>
            <p className="text-[11px] text-[#6B878C]">Tim BESTARI - SMAN Sumatera Selatan</p>
          </div>
        </div>

        <div className="bg-[#F7FAF9] p-3 rounded-xl border border-[#E5ECE9] text-[11px] text-[#6B878C] space-y-1">
          <p className="font-semibold text-[#1E4852]">Samsung Solve for Tomorrow 2026</p>
          <p>Anggota: Faizahra Safina Yuwono, Halim Adi Cahya, Sri Puji Astuti</p>
        </div>

        <button
          onClick={onLogout}
          className="w-full bg-[#FDE8E8] hover:bg-[#FCD4D4] text-[#D9534F] font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out / Lock App</span>
        </button>
      </div>
    </div>
  );
};
