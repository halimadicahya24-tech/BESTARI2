'use client';

import React, { useState } from 'react';
import { Calendar, ChevronRight, Leaf } from 'lucide-react';
import { VisualLog } from '../lib/types';

interface HistoryScreenProps {
  visualLogs: VisualLog[];
  onSelectLog: (log: VisualLog) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ visualLogs, onSelectLog }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'warning' | 'safe'>('all');

  const filteredLogs = visualLogs.filter((log: VisualLog) => {
    if (activeFilter === 'warning') return log.status === 'warning';
    if (activeFilter === 'safe') return log.status === 'safe';
    return true;
  });

  const healthScoreMatrix = [
    { time: '08:00', cam1: 94, cam2: 89, cam3: 96 },
    { time: '10:30', cam1: 78, cam2: 91, cam3: 95 },
    { time: '14:00', cam1: 82, cam2: 88, cam3: 92 },
    { time: '17:00', cam1: 91, cam2: 93, cam3: 97 },
  ];

  return (
    <div className="p-4 space-y-4 pb-24 bg-[#F8FAF9] animate-fade-in font-sans">
      {/* SECTION 1: HEADER & FILTER CHIPS */}
      <div className="bg-white rounded-2xl p-4 border border-[#E1E3E2] shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#305664] flex items-center justify-center text-white shadow-2xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-[#191C1C] font-hanken">Riwayat Telemetri & Log</h2>
              <p className="text-[11px] text-[#41484B]">Log Deteksi Hama & Semprot Otomatis</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#B8EAD7] text-[#1F4F41] border border-[#9FD1BF]">
            {visualLogs.length} Entri Log
          </span>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 pt-1">
          {[
            { id: 'all', label: 'Semua Log' },
            { id: 'warning', label: 'Hama Grayak' },
            { id: 'safe', label: 'Tanaman Sehat' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                activeFilter === f.id
                  ? 'bg-[#305664] text-white shadow-2xs'
                  : 'bg-[#F2F4F3] text-[#41484B] hover:bg-[#ECEEED]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 2: VISUAL INSPECTION LOG CARDS */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold text-[#191C1C] font-hanken uppercase tracking-wider px-1">
          Inspeksi Visual Kamera
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {filteredLogs.map((log: VisualLog) => (
            <div
              key={log.id}
              onClick={() => onSelectLog(log)}
              className="bg-white rounded-2xl border border-[#E1E3E2] overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="relative aspect-[4/3] bg-black">
                <img
                  src={log.image_url}
                  alt={log.cam_id}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span
                  className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                    log.status === 'warning'
                      ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                      : 'bg-[#B8EAD7] text-[#1F4F41] border border-[#9FD1BF]'
                  }`}
                >
                  {log.status === 'warning' ? 'Warning' : 'Normal'}
                </span>
              </div>

              <div className="p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-[#191C1C] font-hanken uppercase">
                    {log.cam_id}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#71787B] group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-[10px] text-[#41484B] truncate">
                  {log.threat_type}
                </p>
                <div className="text-[9px] text-[#71787B] font-mono flex items-center justify-between pt-1 border-t border-[#F2F4F3]">
                  <span>{log.formatted_time}</span>
                  <span>{log.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: HEALTH MATRIX (TRANSPOSED MATRIX) */}
      <div className="bg-white rounded-2xl p-4 border border-[#E1E3E2] shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#71787B] tracking-wider uppercase block font-hanken">
              MATRIKS KESEHATAN TANAMAN
            </span>
            <h3 className="text-xs font-extrabold text-[#191C1C] font-hanken">Plant Health Matrix</h3>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#B8EAD7] flex items-center justify-center text-[#1F4F41]">
            <Leaf className="w-4 h-4" />
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {[
            { name: 'Cam 1', key: 'cam1' as const },
            { name: 'Cam 2', key: 'cam2' as const },
            { name: 'Cam 3', key: 'cam3' as const }
          ].map((cam) => (
            <div key={cam.name} className="flex items-center gap-2 text-[10px] font-mono">
              <span className="w-12 text-[#191C1C] font-extrabold text-xs">{cam.name}</span>
              <div className="grid grid-cols-4 gap-2 flex-1">
                {healthScoreMatrix.map((item) => {
                  const score = item[cam.key];
                  return (
                    <div
                      key={item.time}
                      className={`h-8 rounded-xl flex items-center justify-center font-extrabold text-white text-[11px] shadow-2xs transition-transform hover:scale-105 ${
                        score < 85 ? 'bg-[#BA1A1A]' : score < 92 ? 'bg-[#305664]' : 'bg-[#163F4C]'
                      }`}
                    >
                      {score}%
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2 text-[10px] font-bold text-[#71787B] pt-1">
            <span className="w-12 text-center text-[9px] uppercase tracking-wider text-[#71787B]">Waktu</span>
            <div className="grid grid-cols-4 gap-2 flex-1 text-center font-mono">
              {healthScoreMatrix.map((item) => (
                <span key={item.time} className="bg-[#F2F4F3] py-1 rounded-md text-[#191C1C] font-bold">
                  {item.time}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
