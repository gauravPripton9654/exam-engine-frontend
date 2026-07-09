'use client';

import { UpcomingExam } from '@/lib/mockDashboard';

const ACCENT: Record<UpcomingExam['accent'], { chip: string; tag: string }> = {
  blue:    { chip: 'bg-blue-600',    tag: 'bg-blue-50 text-blue-700' },
  violet:  { chip: 'bg-violet-500',  tag: 'bg-violet-50 text-violet-700' },
  emerald: { chip: 'bg-emerald-500', tag: 'bg-emerald-50 text-emerald-700' },
};

export default function UpcomingExamsCard({ exams }: { exams: UpcomingExam[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Upcoming Exams</h3>
        <button className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
          View All
        </button>
      </div>

      <div className="space-y-1">
        {exams.map(exam => {
          const accent = ACCENT[exam.accent];
          return (
            <div key={exam.id} className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-slate-50 transition-colors">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${accent.chip}`}>
                {exam.code}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">{exam.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{exam.when} ({exam.durationMin} mins)</p>
              </div>
              <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${accent.tag}`}>
                {exam.level}
              </span>
              <button className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 14a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
