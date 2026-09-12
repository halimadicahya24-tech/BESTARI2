'use client';

import React, { useState, useEffect } from 'react';
import { Sliders, Cpu, LogOut, CheckCircle2, ShieldCheck, Server, RefreshCw, Globe, ChevronRight } from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl, testApiConnection, updateSystemConfig, fetchSystemConfig } from '../lib/api';

interface SettingsScreenProps {
  onLogout: () => void;
  onOpenPinouts: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLogout, onOpenPinouts }) => {
  const [autoSprayEnabled, setAutoSprayEnabled] = useState<boolean>(true);
  const [agitateBeforeSpray, setAgitateBeforeSpray] = useState<boolean>(true);
  const [sprayDuration, setSprayDuration] = useState<number>(3);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(75);
  const [apiUrl, setApiUrl] = useState<string>(getApiBaseUrl());
  const [apiStatus, setApiStatus] = useState<'idle' | 'testing' | 'connected' | 'failed'>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  useEffect(() => {
    const loadConfig = async () => {
      const cfg = await fetchSystemConfig();
      if (cfg) {
        if (cfg.spray_duration_sec) setSprayDuration(cfg.spray_duration_sec);
        if (cfg.confidence_threshold) setConfidenceThreshold(Math.round(cfg.confidence_threshold * 100));
        if (cfg.auto_spray_enabled !== undefined) setAutoSprayEnabled(cfg.auto_spray_enabled);
        if (cfg.agitate_before_spray !== undefined) setAgitateBeforeSpray(cfg.agitate_before_spray);
      }
    };
    loadConfig();
  }, []);

  const handleConfigChange = (newConfig: {
    sprayDuration?: number;
    confidenceThreshold?: number;
    autoSprayEnabled?: boolean;
    agitateBeforeSpray?: boolean;
  }) => {
    const duration = newConfig.sprayDuration ?? sprayDuration;
    const confidence = newConfig.confidenceThreshold ?? confidenceThreshold;
    const autoSpray = newConfig.autoSprayEnabled ?? autoSprayEnabled;
    const agitate = newConfig.agitateBeforeSpray ?? agitateBeforeSpray;

    if (newConfig.sprayDuration !== undefined) setSprayDuration(duration);
    if (newConfig.confidenceThreshold !== undefined) setConfidenceThreshold(confidence);
    if (newConfig.autoSprayEnabled !== undefined) setAutoSprayEnabled(autoSpray);
    if (newConfig.agitateBeforeSpray !== undefined) setAgitateBeforeSpray(agitate);

    updateSystemConfig({
      spray_duration_sec: duration,
      confidence_threshold: confidence / 100.0,
      auto_spray_enabled: autoSpray,
      agitate_before_spray: agitate,
    });
  };

  const handleTestConnection = async () => {
    setApiStatus('testing');
    setFeedbackMessage('Menghubungkan ke Flask ESP32...');
    
    setApiBaseUrl(apiUrl);
    const isLive = await testApiConnection();

    if (isLive) {
      setApiStatus('connected');
      setFeedbackMessage('Terhubung ke ESP32 Live Server!');
    } else {
      setApiStatus('failed');
      setFeedbackMessage('Tidak dapat terhubung. Menggunakan Mode Standalone Demo.');
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24 bg-[#F8FAF9] animate-fade-in font-sans">
      {/* SECTION 1: HARDWARE GPIO & PINOUT BANNER */}
      <div className="bg-white rounded-2xl p-4 border border-[#E1E3E2] shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#305664] flex items-center justify-center text-white shadow-2xs">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-[#191C1C] font-hanken">Konfigurasi Pinout ESP32-CAM</h3>
              <p className="text-[11px] text-[#41484B]">Pemetaan Hardware & Sensor Solenoid</p>
            </div>
          </div>
          <button
            onClick={onOpenPinouts}
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#305664] text-white hover:bg-[#163F4C] transition-colors flex items-center gap-1 shadow-2xs"
          >
            <span>Detail Pinout</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-[#F2F4F3] p-2.5 rounded-xl border border-[#E1E3E2]">
            <span className="text-[9px] text-[#71787B] font-sans font-bold block">SOLENOID VALVE</span>
            <span className="text-[#163F4C] font-bold">GPIO 14 (RELAY 1)</span>
          </div>
          <div className="bg-[#F2F4F3] p-2.5 rounded-xl border border-[#E1E3E2]">
            <span className="text-[9px] text-[#71787B] font-sans font-bold block">DINAMO PENGADUK</span>
            <span className="text-[#163F4C] font-bold">GPIO 12 (RELAY 2)</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: FLASK BACKEND CONFIG */}
      <div className="bg-white rounded-2xl p-4 border border-[#E1E3E2] shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F2F4F3] flex items-center justify-center text-[#305664]">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-[#191C1C] font-hanken">IP Server Flask ESP32</h3>
              <p className="text-[11px] text-[#41484B]">Pengaturan Endpoint Live Telemetry</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
            apiStatus === 'connected' ? 'bg-[#B8EAD7] text-[#1F4F41]' : apiStatus === 'testing' ? 'bg-blue-100 text-blue-800' : 'bg-[#FEF3C7] text-[#92400E]'
          }`}>
            {apiStatus === 'testing' ? 'Testing...' : apiStatus === 'connected' ? 'Connected' : 'Standalone'}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://192.168.1.50:5000"
              className="flex-1 bg-[#F2F4F3] border border-[#C1C7CB] focus:border-[#305664] rounded-xl px-3 py-2 text-xs font-mono text-[#191C1C] outline-none"
            />
            <button
              onClick={handleTestConnection}
              className="bg-[#305664] hover:bg-[#163F4C] text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${apiStatus === 'testing' ? 'animate-spin' : ''}`} />
              <span>Tes URL</span>
            </button>
          </div>
          {feedbackMessage && (
            <p className={`text-[11px] font-medium ${apiStatus === 'connected' ? 'text-[#386758]' : 'text-[#D97706]'}`}>
              {feedbackMessage}
            </p>
          )}
        </div>
      </div>

      {/* SECTION 3: AUTOMATION PARAMETERS */}
      <div className="bg-white rounded-2xl p-4 border border-[#E1E3E2] shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#F2F4F3] flex items-center justify-center text-[#305664]">
            <Sliders className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-extrabold text-[#191C1C] font-hanken">Pengaturan Presisi Semprot</h3>
        </div>

        {/* Auto Spray Toggle */}
        <div className="flex items-center justify-between py-1 border-b border-[#F2F4F3]">
          <div>
            <span className="text-xs font-extrabold text-[#191C1C] block font-hanken">Penyemprotan Otomatis</span>
            <span className="text-[10px] text-[#71787B]">Picu valve saat YOLOv8 mendeteksi hama</span>
          </div>
          <button
            onClick={() => handleConfigChange({ autoSprayEnabled: !autoSprayEnabled })}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              autoSprayEnabled ? 'bg-[#305664]' : 'bg-[#C1C7CB]'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
              autoSprayEnabled ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Pre-mix Agitator */}
        <div className="flex items-center justify-between py-1 border-b border-[#F2F4F3]">
          <div>
            <span className="text-xs font-extrabold text-[#191C1C] block font-hanken">Pengaduk Dinamo Pre-mix</span>
            <span className="text-[10px] text-[#71787B]">Aduk spora Beauveria sebelum penyemprotan</span>
          </div>
          <button
            onClick={() => handleConfigChange({ agitateBeforeSpray: !agitateBeforeSpray })}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              agitateBeforeSpray ? 'bg-[#305664]' : 'bg-[#C1C7CB]'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
              agitateBeforeSpray ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Spray Duration */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-[#191C1C]">Durasi Semprot Presisi</span>
            <span className="text-[#305664] font-mono">{sprayDuration} Detik</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={sprayDuration}
            onChange={(e) => handleConfigChange({ sprayDuration: Number(e.target.value) })}
            className="w-full accent-[#305664]"
          />
        </div>

        {/* Confidence Threshold Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-[#191C1C]">Ambang Batas YOLO Confidence</span>
            <span className="text-[#305664] font-mono">{confidenceThreshold}%</span>
          </div>
          <input
            type="range"
            min={30}
            max={90}
            value={confidenceThreshold}
            onChange={(e) => handleConfigChange({ confidenceThreshold: Number(e.target.value) })}
            className="w-full accent-[#305664]"
          />
        </div>
      </div>

      {/* SECTION 4: USER & TEAM CREDIT */}
      <div className="bg-white rounded-2xl p-4 border border-[#E1E3E2] shadow-2xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#163F4C] text-[#A3CADA] font-extrabold flex items-center justify-center text-sm shadow-2xs font-hanken">
            FM
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-[#191C1C] font-hanken">Fajrin Al Majid (Ketua Tim)</h4>
            <p className="text-[10px] text-[#71787B]">Tim BESTARI - SMAN Sumatera Selatan</p>
          </div>
        </div>

        <div className="bg-[#F2F4F3] p-3 rounded-xl border border-[#E1E3E2] text-[11px] text-[#41484B] space-y-1">
          <p className="font-bold text-[#163F4C] font-hanken">Samsung Solve for Tomorrow 2026</p>
          <p className="text-[10px]">Anggota: Faizahra Safina Yuwono, Halim Adi Cahya, Sri Puji Astuti</p>
        </div>

        <button
          onClick={onLogout}
          className="w-full bg-[#FFDAD6] hover:bg-[#FFB4AB] text-[#BA1A1A] font-extrabold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-xs font-hanken shadow-2xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar / Lock App</span>
        </button>
      </div>
    </div>
  );
};
