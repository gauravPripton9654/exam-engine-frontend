'use client';

import { useState } from 'react';
import { Violation, VIOLATION_CONFIG } from '@/types';

interface ViolationLogProps {
  violations: Violation[];
}

const SEV: Record<string, { dot: string; badge: string; row: string }> = {
  low:    { dot: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',   row: '' },
  medium: { dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200', row: '' },
  high:   { dot: 'bg-rose-500',   badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',       row: '' },
};

export default function ViolationLog({ violations }: ViolationLogProps) {
  const [open, setOpen] = useState<string | null>(null);

  const formatTime = (d: Date) =>
    new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (violations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-emerald-700 text-xs font-semibold">No violations</p>
        <p className="text-slate-400 text-[11px] mt-1">All checks passing</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {violations.map((v, idx) => {
        const s      = SEV[v.severity] ?? SEV.low;
        const isOpen = open === v.id;
        const label  = VIOLATION_CONFIG[v.type].label;

        return (
          <button
            key={v.id}
            onClick={() => setOpen(isOpen ? null : v.id)}
            className="w-full text-left"
          >
            <div className={`rounded-xl border transition-all duration-150 overflow-hidden ${
              isOpen
                ? 'border-indigo-200 bg-indigo-50/50'
                : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50'
            }`}>
              {/* Row */}
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-slate-400 font-semibold w-4 text-right">{idx + 1}</span>
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 font-medium truncate">{label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{v.description}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${s.badge}`}>
                    {v.severity[0].toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-400">{formatTime(v.timestamp)}</span>
                </div>
              </div>

              {/* Expanded screenshot */}
              {isOpen && v.screenshot && (
                <div className="px-3 pb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.screenshot}
                    alt="Violation screenshot"
                    className="w-full rounded-lg border border-slate-200 object-cover"
                    style={{ maxHeight: 96 }}
                  />
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
