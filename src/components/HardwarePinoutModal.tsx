'use client';

import React, { useState } from 'react';
import { X, Cpu, Camera, Droplets } from 'lucide-react';

interface HardwarePinoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HardwarePinoutModal: React.FC<HardwarePinoutModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'main' | 'cam'>('main');

  if (!isOpen) return null;

  const mainPinouts = [
    { name: 'RELAY_MIXER', pin: 'GPIO 23', desc: 'Relay 1: Dinamo Pengaduk Tangki Biopestisida', active: true },
    { name: 'RELAY_BIOPEST', pin: 'GPIO 4', desc: 'Relay 2: Pompa Semprot Biopestisida -> 1 Spray Nozzle', active: true },
    { name: 'RELAY_WATER', pin: 'GPIO 19', desc: 'Relay 3: Pompa Siram Air Bersih -> 1 Spray Nozzle', active: true },
    { name: 'NOZZLE_SYSTEM', pin: 'Selang Ganda', desc: '1 Spray Nozzle Tunggal (Muara Selang Biopest & Air)', active: true },
    { name: 'US1_TANK_BIO', pin: 'TRIG 27 / ECHO 33', desc: 'Sensor Ultrasonik Level Tangki Biopestisida', active: true },
    { name: 'US2_TANK_WATER', pin: 'TRIG 25 / ECHO 26', desc: 'Sensor Ultrasonik Level Tangki Air Bersih', active: true },
    { name: 'SOIL_MOISTURE', pin: 'GPIO 34 (ADC1)', desc: 'Sensor Kelembaban Tanah (Aman bersama Wi-Fi)', active: true },
  ];

  const camPinouts = [
    { name: 'CAMERA_OV2640', pin: 'Parallel DVP', desc: 'Bus Data Parallel Kamera (GPIO 5, 18, 19, 21, 36, 39, 34, 35, 25, 23, 2, 0, 26, 27, 32)', active: true },
    { name: 'FLASH_LED', pin: 'GPIO 4', desc: 'Lampu Kilat Pencahayaan Foto Sampel Daun', active: true },
    { name: 'AI_DETECT_NODE', pin: 'HTTP POST /detect', desc: 'Sensor Node khusus Capture & Upload foto ke Server AI', active: true },
  ];

  const currentPinouts = activeTab === 'main' ? mainPinouts : camPinouts;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-scale-up border border-[#D8E4E0] max-h-[90vh] flex flex-col font-sans">
        {/* Header */}
        <div className="bg-[#1E4852] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#A8E6CF]" />
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">Dual-ESP32 Hardware Pinout</h3>
              <p className="text-[10px] text-[#A8E6CF]">BESTARI Schematics (Dual-MCU PRD v3.0)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E5ECE9] bg-[#F7FAF9] p-1.5 gap-1">
          <button
            onClick={() => setActiveTab('main')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'main'
                ? 'bg-[#2A5B64] text-white shadow-xs'
                : 'text-[#6B878C] hover:bg-[#EBF2F0]'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>ESP32 Main Board</span>
          </button>

          <button
            onClick={() => setActiveTab('cam')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'cam'
                ? 'bg-[#2A5B64] text-white shadow-xs'
                : 'text-[#6B878C] hover:bg-[#EBF2F0]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>ESP32-CAM Sensor</span>
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
          {currentPinouts.map((p, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border transition-all ${
                p.active
                  ? 'bg-[#D9F7EC]/40 border-[#A8E6CF] text-[#1E4852]'
                  : 'bg-[#F7FAF9] border-[#E5ECE9] text-[#6B878C]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-xs font-mono">{p.name}</span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  p.active ? 'bg-[#2A5B64] text-white' : 'bg-[#D0DDD8] text-[#1E4852]'
                }`}>
                  {p.pin}
                </span>
              </div>
              <p className="text-[11px] font-sans font-medium">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#EFF4F2] border-t border-[#D8E4E0]">
          <button
            onClick={onClose}
            className="w-full bg-[#2A5B64] hover:bg-[#1E4852] text-white font-bold py-2.5 rounded-xl text-xs"
          >
            Tutup Inspeksi Pinout
          </button>
        </div>
      </div>
    </div>
  );
};
