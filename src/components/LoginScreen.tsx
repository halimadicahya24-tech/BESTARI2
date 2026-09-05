'use client';

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Radio } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('BESTARI@gmail.com');
  const [password, setPassword] = useState('••••••••');
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
    <div className="min-h-screen bg-white flex flex-col justify-between px-6 py-8 max-w-md mx-auto font-sans">
      {/* Top Branding Section */}
      <div className="flex flex-col items-center pt-8 pb-4">
        {/* BESTARI Custom Logo */}
        <div className="w-24 h-24 mb-3 flex items-center justify-center">
          <img src="/logo.png" alt="BESTARI Logo" className="w-full h-full object-contain" />
        </div>

        {/* Title & Tagline */}
        <h1 className="text-3xl font-extrabold text-[#1E4852] tracking-wider mb-2">
          BESTARI
        </h1>
        <p className="text-[#6B878C] text-sm text-center font-medium">
          Smart Farming for a Greener Tomorrow
        </p>
      </div>

      {/* Form Section */}
      <form onSubmit={handleSubmit} className="space-y-5 my-auto">
        {/* EMAIL ADDRESS */}
        <div>
          <label className="block text-xs font-bold text-[#1E4852] tracking-wider uppercase mb-2">
            EMAIL ADDRESS
          </label>
          <div className="relative">
            <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B878C]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#F7FAF9] border border-[#D0DDD8] rounded-xl py-3.5 pl-11 pr-4 text-[#1E4852] font-semibold text-sm focus:outline-none focus:border-[#2A5B64] focus:ring-2 focus:ring-[#A8E6CF]/50 transition-all"
            />
          </div>
        </div>

        {/* PASSWORD */}
        <div>
          <label className="block text-xs font-bold text-[#1E4852] tracking-wider uppercase mb-2">
            PASSWORD
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B878C]" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#F7FAF9] border border-[#D0DDD8] rounded-xl py-3.5 pl-11 pr-11 text-[#1E4852] font-semibold text-sm focus:outline-none focus:border-[#2A5B64] focus:ring-2 focus:ring-[#A8E6CF]/50 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B878C] hover:text-[#1E4852]"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Checkbox & Forgot Password */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 text-[#6B878C] cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-[#1E4852] rounded border-[#D0DDD8] focus:ring-[#2A5B64]"
            />
            Remember me
          </label>
          <a href="#" className="font-bold text-[#1E4852] hover:underline">
            Forgot Password?
          </a>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#2A5B64] hover:bg-[#1E4852] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all transform active:scale-[0.99] text-base"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Login</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* Register Link */}
        <div className="text-center text-xs text-[#6B878C] pt-2">
          Don't have an account?{' '}
          <a href="#" className="font-bold text-[#1E4852] hover:underline">
            Register
          </a>
        </div>
      </form>

      {/* Footer Security Badges */}
      <div className="pt-6 border-t border-[#E5ECE9]">
        <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-[#9AB0B4] tracking-widest uppercase">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2A5B64]" />
            <span>SECURE CONNECTION</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#2D8A68] animate-pulse" />
            <span>SYSTEM ONLINE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
