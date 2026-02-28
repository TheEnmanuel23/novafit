'use client'

import React, { useState, useEffect } from 'react';
import { Clock, Plus, Minus, RotateCcw } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

export function TimeTravel() {
  const [offsetDays, setOffsetDays] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return;
    
    const stored = localStorage.getItem('dev_time_offset_days');
    if (stored) {
      setOffsetDays(parseInt(stored, 10) || 0);
    }
  }, []);

  // Don't render anything in production
  if (process.env.NODE_ENV !== 'development') return null;

  const handleSetOffset = (days: number) => {
    setOffsetDays(days);
    if (days === 0) {
      localStorage.removeItem('dev_time_offset_days');
    } else {
      localStorage.setItem('dev_time_offset_days', days.toString());
    }
    // Dispatch an event so components can update instead of a full reload
    window.dispatchEvent(new Event('time-travel-changed'));
  };

  const simulatedDate = addDays(new Date(), offsetDays);

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {isOpen ? (
        <div className="bg-neutral-900 border border-amber-500/50 rounded-xl shadow-2xl p-4 w-64 text-sm animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-amber-500 flex items-center gap-2">
              <Clock size={16} /> 
              Time Travel (Dev)
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-white">✕</button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-black/50 p-2 rounded-lg text-center border border-white/5">
              <div className="text-xs text-muted-foreground mb-1">Simulated Date</div>
              <div className="font-bold text-emerald-400">
                {format(simulatedDate, 'dd MMM yyyy', { locale: es })}
              </div>
            </div>

            <div className="flex justify-between items-center bg-card/50 rounded-lg p-1">
              <button 
                onClick={() => handleSetOffset(offsetDays - 1)}
                className="p-2 hover:bg-white/10 rounded-md transition"
              >
                <Minus size={14} />
              </button>
              <div className="font-mono font-bold text-base w-12 text-center">
                {offsetDays > 0 ? `+${offsetDays}` : offsetDays}
              </div>
              <button 
                onClick={() => handleSetOffset(offsetDays + 1)}
                className="p-2 hover:bg-white/10 rounded-md transition"
              >
                <Plus size={14} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => handleSetOffset(offsetDays + 7)}
                className="py-1.5 px-2 bg-white/5 hover:bg-white/10 rounded-md text-xs transition"
              >
                +1 Semana
              </button>
              <button 
                onClick={() => handleSetOffset(offsetDays + 30)}
                className="py-1.5 px-2 bg-white/5 hover:bg-white/10 rounded-md text-xs transition"
              >
                +1 Mes
              </button>
            </div>

            <button 
              onClick={() => handleSetOffset(0)}
              disabled={offsetDays === 0}
              className="w-full flex justify-center items-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw size={14} /> Reset Time
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className={`p-3 rounded-full shadow-lg border transition-all ${
            offsetDays !== 0 
              ? 'bg-amber-500 text-black border-amber-400 animate-pulse' 
              : 'bg-neutral-800 text-amber-500 border-white/10 hover:border-amber-500/50'
          }`}
          title="Time Travel Dev Tool"
        >
          <Clock size={20} />
          {offsetDays !== 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              !
            </span>
          )}
        </button>
      )}
    </div>
  );
}
