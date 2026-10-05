'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, X, Move, Maximize2 } from 'lucide-react';

interface ImageInspectorModalProps {
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

export const ImageInspectorModal: React.FC<ImageInspectorModalProps> = ({
  imageUrl,
  title = 'Inspeksi Detail Foto',
  onClose,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset position & zoom when modal opens or image changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [imageUrl]);

  if (!imageUrl) return null;

  // Zoom controls
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 5)); // Max 500%
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const nextZoom = Math.max(prev - 0.5, 1); // Min 100%
      if (nextZoom === 1) {
        setPosition({ x: 0, y: 0 }); // Reset position when at 100%
      }
      return nextZoom;
    });
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // Mouse Wheel Zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(prev + 0.25, 5));
    } else {
      setZoom((prev) => {
        const nextZoom = Math.max(prev - 0.25, 1);
        if (nextZoom === 1) setPosition({ x: 0, y: 0 });
        return nextZoom;
      });
    }
  };

  // Mouse Dragging Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return; // Only allow drag when zoomed in
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Dragging Handlers for Mobile Devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom <= 1 || e.touches.length !== 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Double Click to Toggle 2x Zoom
  const handleDoubleClick = () => {
    if (zoom > 1) {
      handleReset();
    } else {
      setZoom(2);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-3 md:p-6 animate-fade-in font-sans select-none">
      {/* Modal Top Bar */}
      <div className="w-full flex items-center justify-between text-white border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#305664] flex items-center justify-center text-[#B8EAD7]">
            <Maximize2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm font-hanken text-white">{title}</h3>
            <p className="text-[10px] text-white/70">Gunakan mouse scroll atau tombol untuk Zoom & Drag foto</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer border border-white/20"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Interactive Viewer Area */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        className={`w-full flex-1 relative flex items-center justify-center overflow-hidden my-3 rounded-2xl bg-black/50 border border-white/10 ${
          zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
      >
        <img
          src={imageUrl}
          alt="Inspeksi Foto"
          draggable={false}
          className="max-w-full max-h-full object-contain transition-transform duration-75 ease-out rounded-lg shadow-2xl"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          }}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/dummy_photo/bestari_esp32cam_highres.jpg';
          }}
        />

        {/* Floating Instruction Badge */}
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5 pointer-events-none">
          <Move className="w-3 h-3 text-[#B8EAD7]" />
          <span>{zoom > 1 ? 'Klik & tahan untuk menggeser (Drag)' : 'Zoom in untuk menggeser (Drag)'}</span>
        </div>
      </div>

      {/* Floating Bottom Control Toolbar */}
      <div className="bg-[#1F3D47]/90 backdrop-blur-md text-white rounded-2xl px-4 py-2.5 border border-[#3E6B7A] flex items-center gap-3 shadow-2xl">
        {/* Zoom Out Button */}
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 1}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer text-white"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Zoom Scale Display Badge */}
        <span className="text-xs font-mono font-bold px-3 py-1 bg-black/40 rounded-lg border border-white/10 text-[#B8EAD7] min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>

        {/* Zoom In Button */}
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 5}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer text-white"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-white/20" />

        {/* Reset Zoom & Position Button */}
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-[#2E5C4D] hover:bg-[#23483C] active:scale-95 text-white transition-all cursor-pointer border border-[#386758]"
          title="Reset Scale 1:1"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#B8EAD7]" />
          <span>Reset 1:1</span>
        </button>
      </div>
    </div>
  );
};
