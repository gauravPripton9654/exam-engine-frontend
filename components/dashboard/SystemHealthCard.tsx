'use client';

import { ReactElement } from 'react';
import { HardwareCheckItem } from '@/lib/mockDashboard';

const STATUS_META: Record<HardwareCheckItem['status'], { icon: 'check' | 'warning'; classes: string }> = {
  ok:      { icon: 'check',   classes: 'bg-emerald-50 text-emerald-600' },
  warning: { icon: 'warning', classes: 'bg-amber-50 text-amber-600' },
  error:   { icon: 'warning', classes: 'bg-rose-50 text-rose-600' },
};

function StatusIcon({ status }: { status: HardwareCheckItem['status'] }) {
  const meta = STATUS_META[status];
  return (
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.classes}`}>
      {meta.icon === 'check' ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      )}
    </div>
  );
}

const CHECK_ICON: Record<string, ReactElement> = {
  'Webcam & Privacy': (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
  Microphone: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  ),
  'Bandwidth Ping': (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
    </svg>
  ),
};

export default function SystemHealthCard({ checks }: { checks: HardwareCheckItem[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">System Health</p>
          <h3 className="text-sm font-semibold text-slate-900">Hardware Check</h3>
        </div>
        <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        {checks.map(check => (
          <div key={check.label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50">
            <StatusIcon status={check.status} />
            <div className="flex items-center gap-1.5 text-slate-500 min-w-0">
              {CHECK_ICON[check.label]}
              <span className="text-sm font-medium text-slate-700 truncate">{check.label}</span>
            </div>
            <span className={`ml-auto text-[10px] font-bold uppercase tracking-wide ${
              check.status === 'ok' ? 'text-emerald-600' : check.status === 'warning' ? 'text-amber-600' : 'text-rose-600'
            }`}>
              {check.status === 'ok' ? 'Ready' : check.status === 'warning' ? 'Unstable' : 'Failed'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
