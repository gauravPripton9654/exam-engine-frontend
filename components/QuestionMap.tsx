'use client';

import { Question, AnswerValue } from '@/types';

interface QuestionMapProps {
  questions: Question[];
  currentIndex: number;
  answers: Record<number, AnswerValue>;
  markedForReview: Set<number>;
  onNavigate: (index: number) => void;
}

function isAnswered(q: Question, answers: Record<number, AnswerValue>): boolean {
  const a = answers[q.id];
  if (a === undefined) return false;
  if (q.qtype === 'MCQ')   return typeof a === 'number';
  if (q.qtype === 'Multi') return Array.isArray(a) && (a as number[]).length > 0;
  if (q.qtype === 'Match') {
    const m = a as Record<number, number>;
    return q.pairs.every(p => m[p.id] !== undefined);
  }
  if (q.qtype === 'Fill') {
    const f = a as Record<number, string>;
    return q.blanks.every(b => (f[b.blank_index] ?? '').trim() !== '');
  }
  return false;
}

export default function QuestionMap({ questions, currentIndex, answers, markedForReview, onNavigate }: QuestionMapProps) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Question Map</p>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {questions.map((q, i) => {
          const isCurrent  = i === currentIndex;
          const isFlagged  = markedForReview.has(q.id);
          const isDone     = isAnswered(q, answers);

          const color = isFlagged
            ? 'bg-white border-2 border-rose-500 text-rose-600 hover:bg-rose-50'
            : isDone
            ? 'bg-blue-600 border border-blue-600 text-white hover:bg-blue-700'
            : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600';

          return (
            <button
              key={q.id}
              onClick={() => onNavigate(i)}
              title={`Question ${i + 1}${isDone ? ' — Answered' : ''}${isFlagged ? ' — Flagged' : ''}`}
              className={`aspect-square rounded-lg text-xs font-bold transition-all duration-150 ${color} ${
                isCurrent ? 'ring-2 ring-blue-500 ring-offset-1' : ''
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm bg-blue-600 shrink-0" />
          <span className="text-[11px] text-slate-500">Current</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm bg-white border border-slate-300 shrink-0" />
          <span className="text-[11px] text-slate-500">Unanswered</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm bg-white border-2 border-rose-500 shrink-0" />
          <span className="text-[11px] text-slate-500">Flagged</span>
        </div>
      </div>
    </div>
  );
}
