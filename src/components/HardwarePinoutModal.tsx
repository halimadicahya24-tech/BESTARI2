'use client';

import React from 'react';
import { X, Cpu, Zap, CheckCircle } from 'lucide-react';

interface HardwarePinoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HardwarePinoutModal: React.FC<HardwarePinoutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const pinouts = [
    { name: 'RELAY_PIN', pin: 'GPIO 14', desc: 'Relay 2-Ch (Mini Water Pump & Dinamo Agitator)', active: true },
    { name: 'PWDN_GPIO_NUM', pin: 'GPIO 32', desc: 'Power Down Control Kamera', active: false },
    { name: 'XCLK_GPIO_NUM', pin: 'GPIO 0', desc: 'External Clock Kamera', active: false },
    { name: 'SIOD / SIOC', pin: 'GPIO 26 / 27', desc: 'I2C Data & Clock SCCB Kamera', active: false },
    { name: 'Y2 - Y9 Pins', pin: 'GPIO 5, 18, 19, 21, 36, 39, 34, 35', desc: 'Parallel Camera Data Bus', active: false },
    { name: 'VSYNC / HREF', pin: 'GPIO 25 / 23', desc: 'Camera Vertical Sync & Horizontal Ref', active: false },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-scale-up border border-[#D8E4E0] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#1E4852] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#A8E6CF]" />
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">ESP32-CAM Pinout Mapping</h3>
              <p className="text-[10px] text-[#A8E6CF]">BESTARI Hardware Schematics (PRD v2.0)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
          {pinouts.map((p, idx) => (
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
