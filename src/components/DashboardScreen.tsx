'use client';

import React, { useState } from 'react';
import { Camera, AlertTriangle, CheckCircle, Bug, Droplet, Cpu, ShieldCheck, Zap } from 'lucide-react';
import { SystemStatusResponse, CameraFeed } from '../lib/types';
import { triggerManualPump } from '../lib/api';

interface DashboardScreenProps {
  systemStatus: SystemStatusResponse;
  setSystemStatus: React.Dispatch<React.SetStateAction<SystemStatusResponse>>;
  onOpenPinoutModal: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  systemStatus,
  setSystemStatus,
  onOpenPinoutModal,
}) => {
  const cameraFeeds = systemStatus.camera_feeds || [];
  const [selectedCamId, setSelectedCamId] = useState<string>(cameraFeeds[0]?.cam_id || 'Cam 1');
  const [showAiBoxes, setShowAiBoxes] = useState<boolean>(true);
  const [isSpraying, setIsSpraying] = useState<boolean>(false);

  const isWarning = systemStatus.plant_status === 'warning';
  const activeCam = cameraFeeds.find((c: CameraFeed) => c.cam_id === selectedCamId) || cameraFeeds[0];

  const handleManualSprayToggle = async () => {
    setIsSpraying(true);
    await triggerManualPump(5);

    setSystemStatus((prev: SystemStatusResponse) => ({
      ...prev,
      pump_status: {
        ...prev.pump_status,
        is_active: true
      },
      biopesticide_level: Math.max(0, prev.biopesticide_level - 1)
    }));

    setTimeout(() => {
      setIsSpraying(false);
    }, 5000);
  };

  const isPumpActive = systemStatus.pump_status?.is_active || isSpraying;

  return (
    <div className="p-4 space-y-3.5 pb-24 bg-[#F8FAF9] animate-fade-in font-sans">
      {/* Section 1: AI Vision Viewfinder & Camera Selector */}
      <div className="bg-white rounded-2xl p-4 border border-[#E1E3E2] shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#305664] flex items-center justify-center text-white shadow-2xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-[#191C1C] font-hanken">AI Vision Feed</h2>
              <p className="text-[11px] text-[#41484B]">Real-time YOLOv8 Pest Scanner</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#B8EAD7] text-[#1F4F41] border border-[#9FD1BF]">
            LIVE 30 FPS
          </span>
        </div>

        {/* Camera Indicator */}
        {cameraFeeds.length > 1 ? (
          <div className="flex gap-2">
            {cameraFeeds.map((cam: CameraFeed) => {
              const isSelected = cam.cam_id === selectedCamId;
              return (
                <button
                  key={cam.cam_id}
                  onClick={() => setSelectedCamId(cam.cam_id)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-[#305664] text-white shadow-2xs'
                      : 'bg-[#F2F4F3] text-[#41484B] hover:bg-[#ECEEED]'
                  }`}
                >
                  {cam.cam_id.toUpperCase()}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-between bg-[#F2F4F3] px-3 py-1.5 rounded-lg border border-[#E1E3E2] text-xs">
            <span className="font-extrabold text-[#191C1C]">Kamera: <span className="text-[#305664]">ESP32-CAM BESTARI</span></span>
            <span className="text-[10px] text-[#386758] font-bold bg-[#B8EAD7] px-2 py-0.5 rounded-full">Stream Aktif</span>
          </div>
        )}

        {/* Viewfinder Frame Overlay (16:9 Aspect Ratio) */}
        <div className="relative rounded-xl overflow-hidden bg-black border-2 border-[#305664] aspect-[16/9] shadow-inner group">
          {activeCam?.image_url && (
            <img
              src={activeCam.image_url}
              alt={`ESP32-CAM ${selectedCamId}`}
              className="w-full h-full object-cover"
            />
          )}

          {/* AI Bounding Box Overlay (#00FF00 high visibility strike) */}
          {isWarning && showAiBoxes && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-[35%] left-[36%] w-[22%] h-[28%] border-2 border-[#00FF00] rounded bg-[#00FF00]/15 animate-pulse">
                <span className="absolute -top-5 left-0 bg-[#00FF00] text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-sm">
                  Ulat Grayak 91%
                </span>
              </div>
            </div>
          )}

          {/* Inner Viewfinder Reticle Corners */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#00FF00]/80 pointer-events-none" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#00FF00]/80 pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#00FF00]/80 pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#00FF00]/80 pointer-events-none" />

          {/* Overlay Status Badge */}
          <div className="absolute bottom-2.5 left-2.5 bg-[#163F4C]/80 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border border-white/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00FF00] animate-ping" />
            ESP32-CAM: {selectedCamId.toUpperCase()}
          </div>

          <button
            onClick={() => setShowAiBoxes(!showAiBoxes)}
            className="absolute top-2.5 right-2.5 bg-[#163F4C]/80 hover:bg-[#163F4C] text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md border border-white/20 transition-all"
          >
            {showAiBoxes ? 'YOLO Overlay: ON' : 'YOLO Overlay: OFF'}
          </button>
        </div>
      </div>

      {/* Section 2: Real-time Status Cards (Stackable Grid) */}
      <div className="grid grid-cols-2 gap-3">
        {/* PLANT HEALTH CARD */}
        <div className="bg-white rounded-2xl p-3.5 border border-[#E1E3E2] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-[#71787B] tracking-wider uppercase font-hanken">
              PLANT HEALTH
            </span>
            <ShieldCheck className="w-4 h-4 text-[#386758]" />
          </div>

          <div className="my-1">
            {isWarning ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] font-extrabold text-xs border border-[#FDE68A]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Pest Alert</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#B8EAD7] text-[#1F4F41] font-extrabold text-xs border border-[#9FD1BF]">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Sehat Presisi</span>
              </div>
            )}
          </div>

          <p className="text-[10px] text-[#71787B] font-medium">Inspeksi: 2m lalu</p>
        </div>

        {/* THREAT DETECTION SCAN */}
        <div className="bg-white rounded-2xl p-3.5 border border-[#E1E3E2] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-[#71787B] tracking-wider uppercase font-hanken">
              AI DETECTOR
            </span>
            <Bug className={`w-4 h-4 ${isWarning ? 'text-[#D97706]' : 'text-[#71787B]'}`} />
          </div>

          <div className="my-1">
            <p className="font-extrabold text-xs text-[#191C1C] font-hanken">
              {isWarning ? 'Hama Grayak (1)' : 'Bebas Hama'}
            </p>
            <span className="text-[10px] text-[#386758] font-semibold block">
              {isWarning ? 'Tindakan: Micro-Spray' : 'Scanning Aktif'}
            </span>
          </div>

          <p className="text-[10px] text-[#71787B] font-medium">YOLOv8 Confidence: 91%</p>
        </div>
      </div>

      {/* Section 3: Biopesticide Tank Level Card */}
      <div className="bg-white rounded-2xl p-4 border border-[#E1E3E2] shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplet className="w-4 h-4 text-[#305664]" />
            <span className="text-xs font-extrabold text-[#191C1C] font-hanken tracking-wide uppercase">
              TANGKI BIOPESTISIDA (Beauveria)
            </span>
          </div>
          <span className="text-lg font-black text-[#163F4C] font-hanken">
            {systemStatus.biopesticide_level}%
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full bg-[#F2F4F3] h-3.5 rounded-full overflow-hidden p-0.5 border border-[#E1E3E2]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              systemStatus.biopesticide_level < 20
                ? 'bg-[#BA1A1A]'
                : 'bg-[#305664]'
            }`}
            style={{ width: `${systemStatus.biopesticide_level}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-[#71787B] font-semibold">
          <span>0L Kosong</span>
          <span>4.25L Tersisa / 5.0L Kapasitas</span>
        </div>
      </div>

      {/* Section 3B: Ketersediaan Air Capacity Bar (Google Stitch Design) */}
      <div className="bg-white rounded-2xl p-4 border border-[#E1E3E2] shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplet className="w-4 h-4 text-[#386758]" />
            <span className="text-xs font-extrabold text-[#191C1C] font-hanken tracking-wide uppercase">
              KETERSEDIAAN AIR
            </span>
          </div>
          <span className="text-lg font-black text-[#163F4C] font-hanken">
            {(((systemStatus.water_level ?? 60) / 100) * (systemStatus.water_capacity_liters ?? 20)).toFixed(0)}L{' '}
            <span className="text-xs font-medium text-[#41484B]">({systemStatus.water_level ?? 60}%)</span>
          </span>
        </div>

        {/* Progress Bar Container with Shimmer Animation */}
        <div className="w-full bg-[#F2F4F3] h-3.5 rounded-full overflow-hidden p-0.5 border border-[#E1E3E2]">
          <div
            className="h-full bg-[#386758] rounded-full transition-all duration-500 relative overflow-hidden"
            style={{ width: `${systemStatus.water_level ?? 60}%` }}
          >
            <div className="absolute inset-0 opacity-30 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse" />
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-[#71787B] font-semibold">
          <span>0L Kosong</span>
          <span>Kapasitas {systemStatus.water_capacity_liters ?? 20}L</span>
        </div>
      </div>

      {/* Section 4: Pump Action & Micro-Spray Controller */}
      <div className="bg-white rounded-2xl p-4 border border-[#E1E3E2] shadow-2xs flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="font-extrabold text-xs text-[#191C1C] font-hanken">Solenoid Pump Controller</h3>
          <p className="text-[11px] text-[#41484B]">Status Pompa: <strong className="text-[#163F4C]">{isPumpActive ? 'ON' : 'OFF'}</strong></p>
        </div>

        <button
          onClick={handleManualSprayToggle}
          disabled={isSpraying}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all shadow-xs flex items-center gap-2 ${
            isPumpActive
              ? 'bg-[#BA1A1A] hover:bg-[#93000A] text-white'
              : 'bg-[#386758] hover:bg-[#1F4F41] text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          {isSpraying ? 'Memicu...' : isPumpActive ? 'Matikan Pompa' : 'Semprot Manual'}
        </button>
      </div>

      {/* Section 5: Telemetri & System Pinout Quick Banner */}
      <div className="bg-[#305664] text-white rounded-2xl p-4 shadow-xs flex items-center justify-between relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-extrabold tracking-tight font-hanken">ESP32 Telemetry Node</h3>
            <button
              onClick={onOpenPinoutModal}
              className="text-[#A3CADA] text-[10px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded flex items-center gap-1 font-mono transition-colors"
            >
              <Cpu className="w-3 h-3" /> GPIO 14
            </button>
          </div>
          <p className="text-[11px] text-[#A3CADA]">Suhu Lingkungan: {systemStatus.temp}�C | Mode: Otomatis AI</p>
        </div>

        <div className="z-10 bg-white/15 border border-white/20 px-3 py-1.5 rounded-xl flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#B8EAD7] animate-ping" />
          <span className="text-[10px] font-bold text-[#B8EAD7]">NODE A1</span>
        </div>
      </div>
    </div>
  );
};
