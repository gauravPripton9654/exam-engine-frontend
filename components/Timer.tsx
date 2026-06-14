'use client';

interface TimerProps {
  timeRemaining: number;
  totalDuration: number;
}

export default function Timer({ timeRemaining, totalDuration }: TimerProps) {
  const h = Math.floor(timeRemaining / 3600);
  const m = Math.floor((timeRemaining % 3600) / 60);
  const s = timeRemaining % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const percent = (timeRemaining / totalDuration) * 100;

  const urgency = timeRemaining < 300 ? 'text-red-500' : timeRemaining < 600 ? 'text-yellow-500' : 'text-green-400';
  const barColor = timeRemaining < 300 ? 'bg-red-500' : timeRemaining < 600 ? 'bg-yellow-400' : 'bg-green-400';

  return (
    <div className="flex items-center gap-3">
      <div className={`font-mono text-xl font-bold ${urgency} ${timeRemaining < 300 ? 'animate-pulse' : ''}`}>
        {h > 0 && <span>{pad(h)}:</span>}
        <span>{pad(m)}:{pad(s)}</span>
      </div>
      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-1000`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
