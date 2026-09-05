'use client';

import React, { useState } from 'react';
import { Leaf, Bug, CheckCircle, AlertTriangle, Sparkles, RefreshCw, Cpu, Activity } from 'lucide-react';
import { SystemStatusResponse } from '../lib/types';

interface DashboardProps {
  systemStatus: SystemStatusResponse;
  setSystemStatus: React.Dispatch<React.SetStateAction<SystemStatusResponse>>;
  onOpenPinoutModal: () => void;
}

export const DashboardScreen: React.FC<DashboardProps> = ({
  systemStatus,
  setSystemStatus,
  onOpenPinoutModal
}) => {
  const [selectedCamId, setSelectedCamId] = useState<string>('Cam 1');
  const [showAiBoxes, setShowAiBoxes] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active camera object
  const activeCam = systemStatus.camera_feeds.find(c => c.cam_id === selectedCamId) || systemStatus.camera_feeds[0];
  const isWarning = activeCam.cam_id === 'Cam 1' && systemStatus.plant_status === 'warning';

  const handleCameraChange = (camId: string) => {
    setSelectedCamId(camId);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setToastMessage('Telemetri & ESP32-CAM Feed diperbarui');
      setTimeout(() => setToastMessage(null), 2500);
    }, 600);
  };

  return (
    <div className="pb-24 pt-3 px-4 max-w-md mx-auto space-y-4 font-sans bg-[#EFF4F2] min-h-screen">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="bg-[#1E4852] text-[#A8E6CF] text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-between shadow-md animate-fade-in border border-[#A8E6CF]/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#A8E6CF] animate-spin" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white hover:text-gray-300 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Section 1: Last Photo Feed */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-[#1E4852] tracking-tight">Last Photo Feed</h2>
          <button 
            onClick={handleRefresh}
            className="text-[#6B878C] hover:text-[#1E4852] p-1.5 rounded-lg hover:bg-white/60 transition-all flex items-center gap-1 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>

        {/* Camera Selector Tabs */}
        <div className="flex items-center gap-2 mb-3">
          {systemStatus.camera_feeds.map((cam) => {
            const isActive = cam.cam_id === selectedCamId;
            return (
              <button
                key={cam.cam_id}
                onClick={() => handleCameraChange(cam.cam_id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#2A5B64] text-white shadow-sm'
                    : 'bg-white text-[#1E4852] border border-[#D8E4E0] hover:bg-[#E5ECE9]'
                }`}
              >
                {cam.cam_id}
              </button>
            );
          })}
        </div>

        {/* Camera Image Display Frame */}
        <div className="relative rounded-2xl overflow-hidden shadow-md bg-black border border-[#D8E4E0] aspect-[16/10]">
          <img
            src={activeCam.image_url}
            alt={`Tangkapan ESP32-CAM ${selectedCamId}`}
            className="w-full h-full object-cover transition-opacity duration-300"
          />

          {/* AI Bounding Box Overlay for Warning state */}
          {isWarning && showAiBoxes && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-[38%] left-[38%] w-[18%] h-[24%] border-2 border-red-500 rounded bg-red-500/10 animate-pulse">
                <span className="absolute -top-5 left-0 bg-red-600 text-white text-[9px] font-bold px-1 rounded">
                  Ulat Grayak 89%
                </span>
              </div>
              <div className="absolute top-[48%] left-[54%] w-[22%] h-[26%] border-2 border-red-500 rounded bg-red-500/10 animate-pulse">
                <span className="absolute -top-5 left-0 bg-red-600 text-white text-[9px] font-bold px-1 rounded">
                  Ulat Grayak 92%
                </span>
              </div>
            </div>
          )}

          {/* ESP32-CAM Overlay Badge (Bottom Left) */}
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-mono font-bold px-3 py-1 rounded-md border border-white/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            ESP32-CAM: {selectedCamId.toUpperCase()}
          </div>

          {/* Toggle AI Overlay Button (Top Right) */}
          <button
            onClick={() => setShowAiBoxes(!showAiBoxes)}
            className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md border border-white/20"
          >
            {showAiBoxes ? 'YOLOv8 Boxes: ON' : 'YOLOv8 Boxes: OFF'}
          </button>
        </div>
      </div>

      {/* Section 2: Plant Status & Threat Scan Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* PLANT STATUS CARD */}
        <div className="bg-white rounded-2xl p-4 border border-[#D8E4E0] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#6B878C] tracking-wider uppercase">
              PLANT STATUS
            </span>
            <Leaf className="w-4 h-4 text-[#2D8A68]" />
          </div>

          <div className="my-1">
            {isWarning ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDE8E8] text-[#D9534F] font-bold text-sm">
                <AlertTriangle className="w-4 h-4 fill-current text-[#D9534F]" />
                <span>Warning</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D9F7EC] text-[#2D8A68] font-bold text-sm">
                <CheckCircle className="w-4 h-4 fill-current text-[#2D8A68]" />
                <span>Safe</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-[#6B878C] mt-1 font-medium">
            Last check: 2m ago
          </p>
        </div>

        {/* THREAT SCAN CARD */}
        <div className="bg-white rounded-2xl p-4 border border-[#D8E4E0] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#6B878C] tracking-wider uppercase">
              THREAT SCAN
            </span>
            <Bug className={`w-4 h-4 ${isWarning ? 'text-[#D9534F]' : 'text-[#6B878C]'}`} />
          </div>

          <div className="my-1">
            <p className="font-bold text-sm text-[#1E4852]">
              {isWarning ? '2 pests found' : 'No pests found'}
            </p>
            {isWarning && (
              <span className="text-xs text-[#D9534F] font-semibold block">
                (Ulat Grayak)
              </span>
            )}
          </div>

          <p className="text-[11px] text-[#6B878C] mt-1 font-medium">
            {isWarning ? 'Auto-spray triggered' : 'Scanning area...'}
          </p>
        </div>
      </div>

      {/* Section 3: Biopesticide Level Progress Card */}
      <div className="bg-white rounded-2xl p-4 border border-[#D8E4E0] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#6B878C] tracking-wider uppercase">
            BIOPESTICIDE LEVEL
          </span>
          <span className="text-xl font-black text-[#1E4852]">
            {systemStatus.biopesticide_level}%
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full bg-[#E5ECE9] h-3.5 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              systemStatus.biopesticide_level < 20
                ? 'bg-[#D9534F]'
                : 'bg-[#2A5B64]'
            }`}
            style={{ width: `${systemStatus.biopesticide_level}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#6B878C] font-semibold">
          <span>0L Empty</span>
          <span>5L Capacity (Beauveria)</span>
        </div>
      </div>

      {/* Section 4: System Automation & Monitoring Status Card */}
      <div className="bg-[#2A5B64] text-white rounded-2xl p-4 shadow-md flex items-center justify-between relative overflow-hidden">
        {/* Background decorative wave pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />

        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold tracking-tight">Monitoring Mode</h3>
            <button 
              onClick={onOpenPinoutModal}
              className="text-[#A8E6CF] text-[10px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded flex items-center gap-1 font-mono"
            >
              <Cpu className="w-3 h-3" /> GPIO 14
            </button>
          </div>
          <p className="text-xs text-[#A8E6CF] font-medium">
            Monitoring otomatis kondisi tanaman & biopestisida
          </p>
        </div>

        {/* Monitoring Status Badge */}
        <div className="z-10 bg-white/10 border border-white/20 px-3 py-2 rounded-xl flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#A8E6CF] animate-ping" />
          <span className="text-xs font-bold text-[#A8E6CF]">AUTO ON</span>
        </div>
      </div>

      {/* Section 5: Environmental Metrics Cards (2 Columns) */}
      <div className="grid grid-cols-2 gap-3">
        {/* TEMP */}
        <div className="bg-white rounded-2xl p-3.5 border border-[#D8E4E0] shadow-sm text-center">
          <span className="text-xl font-black text-[#1E4852] block">
            {systemStatus.temp}°C
          </span>
          <span className="text-[10px] font-bold text-[#6B878C] tracking-widest uppercase">
            TEMP
          </span>
        </div>

        {/* NODE */}
        <div className="bg-white rounded-2xl p-3.5 border border-[#D8E4E0] shadow-sm text-center">
          <span className="text-xl font-black text-[#1E4852] block">
            {systemStatus.active_node}
          </span>
          <span className="text-[10px] font-bold text-[#6B878C] tracking-widest uppercase">
            NODE
          </span>
        </div>
      </div>
    </div>
  );
};
