'use client';

import { useEffect, useState } from 'react';
import { Violation, VIOLATION_CONFIG } from '@/types';

interface WarningModalProps {
  violation: Violation | null;
  violationCount: number;
  maxViolations: number;
  onDismiss: () => void;
}

const SEVERITY_STYLE = {
  low:    { bg: 'bg-yellow-900/90 border-yellow-600', icon: '⚠️', text: 'text-yellow-300' },
  medium: { bg: 'bg-orange-900/90 border-orange-600', icon: '🚨', text: 'text-orange-300' },
  high:   { bg: 'bg-red-900/90 border-red-600',       icon: '🔴', text: 'text-red-300'    },
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

  const style = SEVERITY_STYLE[violation.severity];
  const label = VIOLATION_CONFIG[violation.type].label;
  const remaining = maxViolations - violationCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`w-full max-w-md mx-4 rounded-xl border-2 ${style.bg} p-6 shadow-2xl`}>
        <div className="flex items-start gap-4">
          <span className="text-4xl">{style.icon}</span>
          <div className="flex-1">
            <h3 className={`text-xl font-bold ${style.text} mb-1`}>
              Proctoring Alert
            </h3>
            <p className="text-white font-semibold text-lg">{label}</p>
            <p className="text-gray-300 text-sm mt-1">{violation.description}</p>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Violations: {violationCount} / {maxViolations}</p>
                {remaining <= 2 && (
                  <p className="text-red-400 text-xs font-semibold mt-0.5">
                    Warning: {remaining} violation{remaining !== 1 ? 's' : ''} remaining before termination
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center text-sm font-bold text-white">
                  {countdown}
                </div>
                <button
                  onClick={onDismiss}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>

        {violation.screenshot && (
          <div className="mt-4">
            <p className="text-gray-400 text-xs mb-1">Screenshot captured:</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={violation.screenshot}
              alt="Violation screenshot"
              className="w-full rounded-lg border border-gray-600 opacity-80"
              style={{ maxHeight: 160, objectFit: 'cover' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
