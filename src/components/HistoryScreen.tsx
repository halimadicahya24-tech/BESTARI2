'use client';

import React, { useState } from 'react';
import { Camera, Calendar, Leaf, Bug, ChevronRight, Filter } from 'lucide-react';
import { VisualLog } from '../lib/types';
import { healthScoreMatrix, threatFrequencyData, pumpActivityData } from '../lib/mockData';

interface HistoryScreenProps {
  visualLogs: VisualLog[];
  onSelectLog: (log: VisualLog) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ visualLogs, onSelectLog }) => {
  const [selectedCam, setSelectedCam] = useState<string>('Cam 1');
  const [timeRange, setTimeRange] = useState<'24h' | '7d'>('24h');

  const filteredLogs = visualLogs.filter(log => selectedCam === 'All' || log.cam_id === selectedCam);

  return (
    <div className="pb-24 pt-3 px-4 max-w-md mx-auto space-y-5 font-sans bg-[#EFF4F2] min-h-screen">
      {/* SECTION 1: DEVICE SELECTION & TIMEFRAME */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#6B878C] tracking-wider uppercase">
            DEVICE SELECTION
          </span>

          {/* Time Range Pill Toggle */}
          <div className="bg-white border border-[#D8E4E0] rounded-lg p-1 flex items-center gap-1 text-xs">
            <button
              onClick={() => setTimeRange('24h')}
              className={`px-3 py-1 rounded-md font-bold transition-colors ${
                timeRange === '24h'
                  ? 'bg-[#1E4852] text-white shadow-sm'
                  : 'text-[#6B878C] hover:text-[#1E4852]'
              }`}
            >
              Last 24h
            </button>
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1 rounded-md font-bold transition-colors ${
                timeRange === '7d'
                  ? 'bg-[#1E4852] text-white shadow-sm'
                  : 'text-[#6B878C] hover:text-[#1E4852]'
              }`}
            >
              7 Days
            </button>
            <button className="p-1 text-[#6B878C] hover:text-[#1E4852]">
              <Calendar className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Camera Selector Pills */}
        <div className="flex items-center gap-2">
          {['Cam 1', 'Cam 2', 'Cam 3'].map((cam) => {
            const isActive = selectedCam === cam;
            return (
              <button
                key={cam}
                onClick={() => setSelectedCam(cam)}
                className={`flex-1 py-2 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-[#2A5B64] text-white shadow-sm'
                    : 'bg-white text-[#1E4852] border border-[#D8E4E0] hover:bg-[#E5ECE9]'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{cam}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: VISUAL LOGS CAROUSEL */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#6B878C] tracking-wider uppercase">
            VISUAL LOGS
          </span>
          <button className="text-xs font-bold text-[#2A5B64] hover:underline flex items-center gap-0.5">
            <span>View Archive</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Horizontal Scroll Gallery */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scroll-smooth">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              onClick={() => onSelectLog(log)}
              className="relative min-w-[200px] h-32 rounded-xl overflow-hidden shadow-sm border border-[#D8E4E0] cursor-pointer group flex-shrink-0"
            >
              <img
                src={log.image_url}
                alt={`Log ${log.id}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* Status Badge Tag */}
              <div className="absolute top-2 left-2">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  log.status === 'warning' ? 'bg-[#D9534F] text-white' : 'bg-[#2D8A68] text-white'
                }`}>
                  {log.status === 'warning' ? `⚠️ ${log.hama_terdeteksi} Pests` : '✔ Healthy'}
                </span>
              </div>

              {/* Timestamp Overlay Pill (Bottom Left & Right matching mockup) */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/65 backdrop-blur-sm text-white text-[10px] font-mono px-2 py-1 rounded-md">
                <span>{log.cam_id} - {log.formatted_time}</span>
                <span>{log.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: PLANT STATUS HISTORY (HEALTH SCORE MATRIX) */}
      <div className="bg-white rounded-2xl p-4 border border-[#D8E4E0] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#6B878C] tracking-wider uppercase block">
              PLANT STATUS HISTORY
            </span>
            <h3 className="text-sm font-extrabold text-[#1E4852]">Health Score Matrix</h3>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#D9F7EC] flex items-center justify-center text-[#2D8A68]">
            <Leaf className="w-4 h-4" />
          </div>
        </div>

        {/* Transposed Matrix: Y-Axis = Cam 1..3, X-Axis = Time */}
        <div className="space-y-2 pt-1">
          {[
            { name: 'Cam 1', key: 'cam1' as const },
            { name: 'Cam 2', key: 'cam2' as const },
            { name: 'Cam 3', key: 'cam3' as const }
          ].map((cam) => (
            <div key={cam.name} className="flex items-center gap-2 text-[10px] font-mono">
              <span className="w-12 text-[#1E4852] font-extrabold text-xs">{cam.name}</span>
              <div className="grid grid-cols-4 gap-2 flex-1">
                {healthScoreMatrix.map((item) => {
                  const score = item[cam.key];
                  return (
                    <div
                      key={item.time}
                      className={`h-8 rounded-xl flex items-center justify-center font-bold text-white text-[11px] shadow-xs transition-transform hover:scale-105 ${
                        score < 85 ? 'bg-[#D9534F]' : score < 92 ? 'bg-[#2A5B64]' : 'bg-[#1E4852]'
                      }`}
                    >
                      {score}%
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* X-Axis Header/Footer Time Labels */}
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#6B878C] pt-1">
            <span className="w-12 text-center text-[9px] uppercase tracking-wider text-[#6B878C]">Kamera</span>
            <div className="grid grid-cols-4 gap-2 flex-1 text-center font-mono">
              {healthScoreMatrix.map((item) => (
                <span key={item.time} className="bg-[#EFF4F2] py-1 rounded-md text-[#1E4852] font-extrabold">
                  {item.time}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: THREAT FREQUENCY (PEST DETECTIONS LINE CHART) */}
      <div className="bg-white rounded-2xl p-4 border border-[#D8E4E0] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#6B878C] tracking-wider uppercase block">
              THREAT FREQUENCY
            </span>
            <h3 className="text-sm font-extrabold text-[#1E4852]">Pest Detections Line Chart</h3>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#FDE8E8] flex items-center justify-center text-[#D9534F]">
            <Bug className="w-4 h-4" />
          </div>
        </div>

        {/* Clear SVG Line Chart with Quantity (Y) and Time (X) Axes */}
        <div className="bg-[#FAFDFB] border border-[#E5ECE9] rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-[#D9534F] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#D9534F] animate-pulse" />
              Sumbu Y: Jumlah Hama (Ekor)
            </span>
            <span className="text-[#1E4852]">
              Sumbu X: Waktu Pengamatan
            </span>
          </div>

          <div className="relative pt-1">
            <svg className="w-full h-36 overflow-visible" viewBox="0 0 340 140">
              <defs>
                <linearGradient id="pestGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D9534F" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#D9534F" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Y-Axis Grid Lines & Numbers */}
              {[
                { val: 12, y: 20 },
                { val: 9, y: 42.5 },
                { val: 6, y: 65 },
                { val: 3, y: 87.5 },
                { val: 0, y: 110 }
              ].map((grid) => (
                <g key={grid.val}>
                  <line x1="35" y1={grid.y} x2="325" y2={grid.y} stroke="#E5ECE9" strokeDasharray="3 3" />
                  <text x="26" y={grid.y + 3} fontSize="9" fontFamily="monospace" fontWeight="bold" fill="#6B878C" textAnchor="end">
                    {grid.val}
                  </text>
                </g>
              ))}

              {/* Area Gradient Under Line */}
              <path
                d="M 35 102.5 L 83.3 95 L 131.6 80 L 180 65 L 228.3 42.5 L 276.6 57.5 L 325 87.5 L 325 110 L 35 110 Z"
                fill="url(#pestGradient)"
              />

              {/* Continuous Red Line Path */}
              <path
                d="M 35 102.5 L 83.3 95 L 131.6 80 L 180 65 L 228.3 42.5 L 276.6 57.5 L 325 87.5"
                fill="none"
                stroke="#D9534F"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Points with Badges & X-Axis Time Labels */}
              {[
                { time: '00:00', q: 1, x: 35, y: 102.5 },
                { time: '04:00', q: 2, x: 83.3, y: 95 },
                { time: '08:00', q: 4, x: 131.6, y: 80 },
                { time: '12:00', q: 6, x: 180, y: 65 },
                { time: '14:00', q: 9, x: 228.3, y: 42.5, isPeak: true },
                { time: '18:00', q: 7, x: 276.6, y: 57.5 },
                { time: '22:00', q: 3, x: 325, y: 87.5 }
              ].map((pt) => (
                <g key={pt.time}>
                  {/* Point circle */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={pt.isPeak ? 6 : 4.5}
                    fill={pt.isPeak ? '#D9534F' : '#1E4852'}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  {/* Quantity value badge */}
                  <text
                    x={pt.x}
                    y={pt.y - 8}
                    fontSize="9"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    fill={pt.isPeak ? '#D9534F' : '#1E4852'}
                    textAnchor="middle"
                  >
                    {pt.q}
                  </text>
                  {/* X-Axis Time Label */}
                  <text
                    x={pt.x}
                    y="126"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    fill="#6B878C"
                    textAnchor="middle"
                  >
                    {pt.time}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="pt-2 border-t border-[#E5ECE9] flex items-center justify-between text-[10px] text-[#6B878C] font-semibold">
            <span>Puncak deteksi: 9 ekor (14:00 WIB)</span>
            <span className="text-[#D9534F] font-bold">• YOLOv8 Detection Log</span>
          </div>
        </div>
      </div>
    </div>
  );
};
