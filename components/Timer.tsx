'use client';

interface TimerProps {
  timeRemaining: number;
  totalDuration: number;
}

export default function Timer({ timeRemaining, totalDuration }: TimerProps) {
  void totalDuration;
  const h = Math.floor(timeRemaining / 3600);
  const m = Math.floor((timeRemaining % 3600) / 60);
  const s = timeRemaining % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  const isUrgent  = timeRemaining < 300;
  const isWarning = !isUrgent && timeRemaining < 600;

  return (
    <div className="flex items-center gap-2">
      <svg className={`w-4 h-4 shrink-0 ${isUrgent ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-slate-400'}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="text-right">
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none mb-0.5">
          Remaining Time
        </p>
        <span className={`font-semibold text-sm tabular-nums tracking-tight leading-none ${
          isUrgent ? 'text-rose-600 animate-pulse' : isWarning ? 'text-amber-600' : 'text-slate-900'
        }`}>
          {h > 0 && <span>{pad(h)}:</span>}
          {pad(m)}:{pad(s)}
        </span>
      </div>
    </div>
  );
}
