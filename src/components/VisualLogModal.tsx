'use client';

import React, { useState } from 'react';
import { X, Calendar, Clock, Camera, Bug, CheckCircle, AlertTriangle, Cpu, Maximize2 } from 'lucide-react';
import { VisualLog } from '../lib/types';
import { ImageInspectorModal } from './ImageInspectorModal';

interface VisualLogModalProps {
  log: VisualLog | null;
  onClose: () => void;
}

export const VisualLogModal: React.FC<VisualLogModalProps> = ({ log, onClose }) => {
  const [showInspector, setShowInspector] = useState<boolean>(false);

  if (!log) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-scale-up border border-[#D8E4E0]">
          {/* Modal Header Image */}
          <div className="relative aspect-[16/10] bg-black group cursor-pointer" onClick={() => setShowInspector(true)}>
            <img
              src={log.image_url}
              alt={log.id}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/dummy_photo/bestari_esp32cam_highres.jpg';
              }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-3 bg-black/70 text-white text-[10px] font-mono px-2.5 py-1 rounded">
              ID: {log.id} | {log.cam_id}
            </div>

            {/* Click to inspect overlay hint */}
            <div className="absolute top-3 left-3 bg-[#163F4C]/80 hover:bg-[#163F4C] text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md border border-white/20 flex items-center gap-1">
              <Maximize2 className="w-3 h-3 text-[#B8EAD7]" />
              <span>Zoom & Drag</span>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#1E4852]">{log.threat_type}</h3>
                <div className="flex items-center gap-2 text-xs text-[#6B878C] font-medium mt-0.5">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{log.formatted_time}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{log.date}</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                log.status === 'warning' ? 'bg-[#FDE8E8] text-[#D9534F]' : 'bg-[#D9F7EC] text-[#2D8A68]'
              }`}>
                {log.status === 'warning' ? '⚠️ Warning' : '✔ Safe'}
              </span>
            </div>

            {/* AI Metrics Card */}
            <div className="bg-[#F7FAF9] p-3 rounded-xl border border-[#E5ECE9] space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-[#6B878C] font-sans font-semibold">YOLOv8 AI Engine:</span>
                <span className="text-[#1E4852] font-bold">Model v8.2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B878C] font-sans font-semibold">Detection Confidence:</span>
                <span className="text-[#1E4852] font-bold">{(log.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B878C] font-sans font-semibold">Hama Terdeteksi:</span>
                <span className={`font-bold ${log.hama_terdeteksi > 0 ? 'text-[#D9534F]' : 'text-[#2D8A68]'}`}>
                  {log.hama_terdeteksi} Ekor (Bebas Hama)
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-1 flex gap-2">
              <button
                onClick={() => setShowInspector(true)}
                className="flex-1 bg-[#305664] hover:bg-[#254450] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#B8EAD7]" />
                <span>Inspeksi Fullscreen</span>
              </button>
              <button
                onClick={onClose}
                className="bg-[#EFF4F2] hover:bg-[#D8E4E0] text-[#1E4852] font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN PHOTO INSPECTOR MODAL */}
      {showInspector && (
        <ImageInspectorModal
          imageUrl={log.image_url}
          title={`Inspeksi Detail: ${log.threat_type} (${log.date})`}
          onClose={() => setShowInspector(false)}
        />
      )}
    </>
  );
};
