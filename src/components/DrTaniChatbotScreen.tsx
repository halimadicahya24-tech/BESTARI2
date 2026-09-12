'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, ShieldCheck, Leaf } from 'lucide-react';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  badge?: string;
}

export const DrTaniChatbotScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Halo! Saya **Dr. Tani AI**, asisten pertani cerdas BESTARI bertenaga **Google Gemini AI**. Ada yang bisa saya bantu terkait pencegahan hama, formula biopestisida *Beauveria bassiana*, atau telemetri tanaman Anda hari ini?',
      timestamp: '10:00 AM',
      badge: 'Gemini AI Ready'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    'Berapa konsentrasi Beauveria bassiana ideal?',
    'Bagaimana penanganan Hama Grayak (Spodoptera)?',
    'Berapa sisa biopestisida di tangki?',
    'Rekomendasi waktu penyemprotan otomatis'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: messages
        })
      });

      const data = await res.json();

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: data.reply || 'Maaf, terjadi kesalahan saat memproses jawaban.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        badge: data.isFallback ? 'Pemberitahuan System' : 'Gemini AI Response'
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: 'Sistem mengalami kesulitan jaringan. Silakan pastikan server Next.js berjalan di `http://localhost:3000`.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        badge: 'Error System'
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const formatMessageText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
      return (
        <React.Fragment key={lineIdx}>
          {parts.map((part, partIdx) => {
            if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
              return (
                <strong key={partIdx} className="font-bold text-[#163F4C]">
                  {part.slice(2, -2)}
                </strong>
              );
            } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
              return (
                <em key={partIdx} className="italic">
                  {part.slice(1, -1)}
                </em>
              );
            }
            return part.replace(/\*/g, '');
          })}
          {lineIdx < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] md:h-[720px] bg-[#F8FAF9] p-3 animate-fade-in font-sans">
      {/* Bot Top Banner */}
      <div className="bg-[#305664] text-white p-3.5 rounded-2xl shadow-sm flex items-center justify-between mb-3 border border-[#163F4C]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B8EAD7] flex items-center justify-center text-[#163F4C] shadow-xs">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm font-hanken tracking-wide flex items-center gap-1.5">
              Dr. Tani AI Chatbot
              <Sparkles className="w-3.5 h-3.5 text-[#A3CADA]" />
            </h2>
            <p className="text-[11px] text-[#A3CADA]">Powered by Google Gemini 3.5 Flash Lite</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-[#386758] text-white text-[10px] font-bold border border-[#B8EAD7]/30 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-[#B8EAD7]" /> Gemini Active
        </span>
      </div>

      {/* Quick Suggestion Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin mb-1">
        {quickQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="shrink-0 bg-white hover:bg-[#ECEEED] text-[#305664] border border-[#C1C7CB] text-[11px] font-medium px-3 py-1.5 rounded-full transition-all text-left shadow-2xs hover:border-[#305664]"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages List */}
      <div className="flex-1 overflow-y-auto space-y-3 p-2 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 shadow-2xs transition-all ${
                msg.sender === 'user'
                  ? 'bg-[#163F4C] text-white rounded-br-none'
                  : 'bg-white text-[#191C1C] border border-[#E1E3E2] rounded-bl-none'
              }`}
            >
              {msg.badge && msg.sender === 'bot' && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#B8EAD7] text-[#1F4F41] text-[10px] font-bold mb-1.5">
                  <Leaf className="w-3 h-3" />
                  {msg.badge}
                </div>
              )}
              <div className="text-xs leading-relaxed">{formatMessageText(msg.text)}</div>
              <span
                className={`block text-[9px] mt-1.5 text-right ${
                  msg.sender === 'user' ? 'text-[#A3CADA]' : 'text-[#71787B]'
                }`}
              >
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#E1E3E2] rounded-2xl rounded-bl-none p-3 shadow-2xs flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#305664] animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-[#386758] animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-[#A3CADA] animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] text-[#71787B] font-medium ml-1">Dr. Tani Gemini AI sedang menganalisis...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="mt-2 pt-2 border-t border-[#E1E3E2] flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Tanyakan topik pertanian / Gemini AI..."
          className="flex-1 bg-white border border-[#C1C7CB] focus:border-[#305664] focus:ring-1 focus:ring-[#305664] rounded-xl px-3.5 py-2.5 text-xs text-[#191C1C] outline-none shadow-2xs transition-all placeholder:text-[#71787B]"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim()}
          className="bg-[#305664] hover:bg-[#163F4C] disabled:bg-[#ECEEED] disabled:text-[#71787B] text-white p-2.5 rounded-xl transition-all shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};