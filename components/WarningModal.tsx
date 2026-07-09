'use client';

import { useEffect, useState } from 'react';
import { Violation, VIOLATION_CONFIG } from '@/types';

interface WarningModalProps {
  violation: Violation | null;
  violationCount: number;
  maxViolations: number;
  onDismiss: () => void;
}

const SEVERITY_CONFIG = {
  low:    { wrapper: 'bg-amber-50 border-amber-200',   title: 'text-amber-800',  bar: 'bg-amber-500',   iconBg: 'bg-amber-100',   iconColor: 'text-amber-600'  },
  medium: { wrapper: 'bg-orange-50 border-orange-200', title: 'text-orange-800', bar: 'bg-orange-500',  iconBg: 'bg-orange-100',  iconColor: 'text-orange-600' },
  high:   { wrapper: 'bg-rose-50 border-rose-200',     title: 'text-rose-800',   bar: 'bg-rose-500',    iconBg: 'bg-rose-100',    iconColor: 'text-rose-600'   },
};

export default function WarningModal({ violation, violationCount, maxViolations, onDismiss }: WarningModalProps) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!violation) return;
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); onDismiss(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [violation, onDismiss]);

  if (!violation) return null;

  const cfg = SEVERITY_CONFIG[violation.severity];
  const label = VIOLATION_CONFIG[violation.type].label;
  const remaining = maxViolations - violationCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className={`w-full max-w-md mx-4 rounded-2xl border-2 ${cfg.wrapper} shadow-2xl overflow-hidden`}>
        {/* Progress bar */}
        <div className="h-1 bg-slate-200">
          <div
            className={`h-full ${cfg.bar} transition-all`}
            style={{ width: `${(countdown / 5) * 100}%`, transitionDuration: '1s' }}
          />
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 ${cfg.iconBg} rounded-xl flex items-center justify-center shrink-0 mt-0.5`}>
              <svg className={`w-5 h-5 ${cfg.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${cfg.title}`}>
                Proctoring Alert
              </p>
              <h3 className="text-slate-900 font-semibold text-base leading-snug">{label}</h3>
              <p className="text-slate-500 text-sm mt-1 leading-relaxed">{violation.description}</p>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">
                    Violation <span className="font-semibold text-slate-700">{violationCount}</span> of {maxViolations}
                  </p>
                  {remaining <= 2 && (
                    <p className="text-rose-600 text-xs font-semibold mt-0.5">
                      {remaining} violation{remaining !== 1 ? 's' : ''} remaining before auto-submission
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8">
                    <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="13" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                      <circle
                        cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="3"
                        strokeDasharray={`${2 * Math.PI * 13}`}
                        strokeDashoffset={`${2 * Math.PI * 13 * (1 - countdown / 5)}`}
                        className={cfg.iconColor}
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                      {countdown}
                    </span>
                  </div>
                  <button
                    onClick={onDismiss}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>

          {violation.screenshot && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="text-slate-400 text-xs mb-2 font-medium">Screenshot captured</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={violation.screenshot}
                alt="Violation screenshot"
                className="w-full rounded-xl border border-slate-200 opacity-90"
                style={{ maxHeight: 160, objectFit: 'cover' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
