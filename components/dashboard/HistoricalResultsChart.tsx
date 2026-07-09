'use client';

import { useState, useRef, MouseEvent } from 'react';
import { ResultPoint, monthlyResults, quarterlyResults } from '@/lib/mockDashboard';

const WIDTH  = 560;
const HEIGHT = 200;
const PAD_L  = 32;
const PAD_R  = 12;
const PAD_T  = 16;
const PAD_B  = 28;
const Y_TICKS = [0, 25, 50, 75, 100];

function buildPoints(data: ResultPoint[]) {
  const innerW = WIDTH - PAD_L - PAD_R;
  const innerH = HEIGHT - PAD_T - PAD_B;
  return data.map((d, i) => {
    const x = PAD_L + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = PAD_T + innerH * (1 - d.score / 100);
    return { ...d, x, y };
  });
}

export default function HistoricalResultsChart() {
  const [view, setView] = useState<'monthly' | 'quarterly'>('monthly');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const data   = view === 'monthly' ? monthlyResults : quarterlyResults;
  const points = buildPoints(data);
  const innerH = HEIGHT - PAD_T - PAD_B;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PAD_T + innerH} L ${points[0].x} ${PAD_T + innerH} Z`;

  const latest = points[points.length - 1];

  const handleMove = (e: MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - relX);
      if (d < best) { best = d; nearest = i; }
    });
    setHoverIdx(nearest);
  };

  const hovered = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Historical Results</h3>
          <p className="text-xs text-slate-400 mt-0.5">Performance across your last {data.length} assessments</p>
        </div>
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 shrink-0">
          {(['quarterly', 'monthly'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => { setView(mode); setHoverIdx(null); }}
              className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                view === mode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-3">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* gridlines */}
          {Y_TICKS.map(t => {
            const y = PAD_T + innerH * (1 - t / 100);
            return (
              <g key={t}>
                <line x1={PAD_L} x2={WIDTH - PAD_R} y1={y} y2={y} stroke="#F1F5F9" strokeWidth={1} />
                <text x={PAD_L - 8} y={y} textAnchor="end" dominantBaseline="middle" className="fill-slate-400" style={{ fontSize: 9 }}>
                  {t}
                </text>
              </g>
            );
          })}

          {/* area + line */}
          <path d={areaPath} fill="#2563EB" fillOpacity={0.1} stroke="none" />
          <path d={linePath} fill="none" stroke="#2563EB" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {/* x labels */}
          {points.map(p => (
            <text key={p.label} x={p.x} y={HEIGHT - 8} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 9 }}>
              {p.label}
            </text>
          ))}

          {/* endpoint marker + label */}
          <circle cx={latest.x} cy={latest.y} r={4} fill="#2563EB" stroke="white" strokeWidth={2} />
          <text x={latest.x} y={latest.y - 10} textAnchor="middle" className="fill-slate-700 font-semibold" style={{ fontSize: 11 }}>
            {latest.score}
          </text>

          {/* hover crosshair */}
          {hovered && (
            <g>
              <line x1={hovered.x} x2={hovered.x} y1={PAD_T} y2={PAD_T + innerH} stroke="#CBD5E1" strokeWidth={1} strokeDasharray="3 3" />
              <circle cx={hovered.x} cy={hovered.y} r={5} fill="#2563EB" stroke="white" strokeWidth={2} />
            </g>
          )}
        </svg>

        {hovered && (
          <div
            className="absolute pointer-events-none bg-slate-900 text-white text-[11px] font-medium rounded-lg px-2.5 py-1.5 shadow-lg -translate-x-1/2 -translate-y-full"
            style={{ left: `${(hovered.x / WIDTH) * 100}%`, top: `${(hovered.y / HEIGHT) * 100}%`, marginTop: -8 }}
          >
            {hovered.label}: <span className="font-bold">{hovered.score}%</span>
          </div>
        )}
      </div>

      <table className="sr-only">
        <caption>Historical results, {view}</caption>
        <thead><tr><th>Period</th><th>Score</th></tr></thead>
        <tbody>
          {data.map(d => (
            <tr key={d.label}><td>{d.label}</td><td>{d.score}%</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
