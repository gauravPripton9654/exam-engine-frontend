'use client';

import { useEffect } from 'react';
import { Violation, VIOLATION_CONFIG } from '@/types';

interface ViolationToastProps {
  violation: Violation | null;
  onDismiss: () => void;
}

const SEVERITY_CONFIG = {
  low:    { bar: 'bg-amber-500',  iconBg: 'bg-amber-100',  iconColor: 'text-amber-600'  },
  medium: { bar: 'bg-orange-500', iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
  high:   { bar: 'bg-rose-500',   iconBg: 'bg-rose-100',   iconColor: 'text-rose-600'   },
};

const AUTO_DISMISS_MS = 3000;

// Never blocks or covers exam content — the violation is already recorded in
// proctor state the moment it happens; this is just a corner acknowledgement.
export default function ViolationToast({ violation, onDismiss }: ViolationToastProps) {
  useEffect(() => {
    if (!violation) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [violation, onDismiss]);

  if (!violation) return null;

  const cfg   = SEVERITY_CONFIG[violation.severity];
  const label = VIOLATION_CONFIG[violation.type].label;

  return (
    <div className="fixed top-4 right-4 z-50 w-72">
      <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
        <div className={`h-1 ${cfg.bar}`} />
        <div className="p-3 flex items-start gap-2.5">
          <div className={`w-7 h-7 ${cfg.iconBg} rounded-lg flex items-center justify-center shrink-0`}>
            <svg className={`w-3.5 h-3.5 ${cfg.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800">{label}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{violation.description}</p>
          </div>
          <button onClick={onDismiss} className="text-slate-300 hover:text-slate-500 shrink-0 -mt-0.5 -mr-0.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
