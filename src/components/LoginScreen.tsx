'use client';

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Radio } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('BESTARI@gmail.com');
  const [password, setPassword] = useState('���������');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-between px-6 py-8 max-w-md mx-auto font-sans">
      {/* Top Branding Section */}
      <div className="flex flex-col items-center pt-8 pb-4">
        {/* BESTARI Custom Logo */}
        <div className="w-24 h-24 mb-3 flex items-center justify-center">
          <img src="/logo.png" alt="BESTARI Logo" className="w-full h-full object-contain" />
        </div>

        {/* Title & Tagline */}
        <h1 className="text-3xl font-extrabold text-[#163F4C] tracking-wider mb-1 font-hanken">
          BESTARI
        </h1>
        <p className="text-[#41484B] text-xs text-center font-medium">
          Biopesticide Eco-Spray Technology with AI Vision
        </p>
        <span className="mt-1.5 px-2.5 py-0.5 rounded-full bg-[#B8EAD7] text-[#1F4F41] text-[10px] font-bold border border-[#9FD1BF]">
          Samsung Solve for Tomorrow 2026
        </span>
      </div>

      {/* Form Section */}
      <form onSubmit={handleSubmit} className="space-y-4 my-auto bg-white p-5 rounded-2xl border border-[#E1E3E2] shadow-2xs">
        {/* EMAIL ADDRESS */}
        <div>
          <label className="block text-[11px] font-bold text-[#191C1C] tracking-wider uppercase mb-1.5 font-hanken">
            ALAMAT EMAIL
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71787B]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#F2F4F3] border border-[#C1C7CB] rounded-xl py-3 pl-10 pr-4 text-[#191C1C] font-semibold text-xs focus:outline-none focus:border-[#305664] focus:ring-1 focus:ring-[#305664] transition-all"
            />
          </div>
        </div>

        {/* PASSWORD */}
        <div>
          <label className="block text-[11px] font-bold text-[#191C1C] tracking-wider uppercase mb-1.5 font-hanken">
            KATA KUNCI / PASSWORD
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71787B]" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#F2F4F3] border border-[#C1C7CB] rounded-xl py-3 pl-10 pr-10 text-[#191C1C] font-semibold text-xs focus:outline-none focus:border-[#305664] focus:ring-1 focus:ring-[#305664] transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#71787B] hover:text-[#191C1C]"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Checkbox & Forgot Password */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 text-[#71787B] cursor-pointer font-medium text-[11px]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-[#305664] rounded border-[#C1C7CB] focus:ring-[#305664]"
            />
            Ingat saya
          </label>
          <a href="#" className="font-bold text-[#305664] hover:underline text-[11px]">
            Lupa Password?
          </a>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#305664] hover:bg-[#163F4C] text-white font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-2xs transition-all transform active:scale-[0.99] text-xs font-hanken"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Masuk ke System Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Footer Security Badges */}
      <div className="pt-4">
        <div className="flex items-center justify-center gap-6 text-[9px] font-extrabold text-[#71787B] tracking-widest uppercase">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#305664]" />
            <span>KONEKSI ENKRIPSI AES</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#386758] animate-pulse" />
            <span>SFT 2026 ONLINE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
