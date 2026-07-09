'use client';

import { ExamConfig, Question, AnswerValue } from '@/types';

interface QuestionPanelProps {
  exam: ExamConfig;
  currentIndex: number;
  answers: Record<number, AnswerValue>;
  markedForReview: Set<number>;
  onAnswer: (questionId: number, value: AnswerValue) => void;
  onToggleMark: (questionId: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
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

const TYPE_META: Record<string, { label: string; pill: string; hint?: string }> = {
  MCQ:   { label: 'Single Choice',   pill: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200/60' },
  Multi: { label: 'Multiple Select', pill: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200/60',   hint: 'Select all that apply' },
  Match: { label: 'Match Pairs',     pill: 'bg-teal-50 text-teal-600 ring-1 ring-teal-200/60',      hint: 'Match left to right' },
  Fill:  { label: 'Fill in Blank',   pill: 'bg-violet-50 text-violet-600 ring-1 ring-violet-200/60', hint: 'Type your answer' },
};

// ── MCQ ──────────────────────────────────────────────────────────────────────
function McqOptions({ q, answers, onAnswer }: {
  q: Question; answers: Record<number, AnswerValue>; onAnswer: (id: number, v: AnswerValue) => void;
}) {
  const selected = answers[q.id] as number | undefined;
  return (
    <div className="space-y-2">
      {q.options.map((opt, idx) => {
        const active = selected === idx;
        return (
          <button
            key={opt.id}
            onClick={() => onAnswer(q.id, idx)}
            className={`group w-full text-left rounded-xl border transition-all duration-150 ${
              active
                ? 'border-blue-300 bg-blue-50/80 shadow-sm shadow-blue-100'
                : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/30'
            }`}
          >
            <div className="flex items-center gap-3.5 px-4 py-3.5">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
                active ? 'border-blue-500 bg-blue-500' : 'border-slate-300 group-hover:border-blue-300'
              }`}>
                {active && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex items-baseline gap-2.5 flex-1">
                <span className={`text-xs font-bold w-4 shrink-0 ${active ? 'text-blue-500' : 'text-slate-400'}`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className={`text-sm leading-snug ${active ? 'text-blue-900 font-medium' : 'text-slate-700'}`}>
                  {opt.option_text}
                </span>
              </div>
              {active && (
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Multi-select ──────────────────────────────────────────────────────────────
function MultiOptions({ q, answers, onAnswer }: {
  q: Question; answers: Record<number, AnswerValue>; onAnswer: (id: number, v: AnswerValue) => void;
}) {
  const selected: number[] = (answers[q.id] as number[] | undefined) ?? [];
  const toggle = (idx: number) => {
    const next = selected.includes(idx) ? selected.filter(i => i !== idx) : [...selected, idx];
    onAnswer(q.id, next);
  };

  return (
    <div className="space-y-2">
      {q.options.map((opt, idx) => {
        const active = selected.includes(idx);
        return (
          <button
            key={opt.id}
            onClick={() => toggle(idx)}
            className={`group w-full text-left rounded-xl border transition-all duration-150 ${
              active
                ? 'border-blue-300 bg-blue-50/80 shadow-sm shadow-blue-100'
                : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/30'
            }`}
          >
            <div className="flex items-center gap-3.5 px-4 py-3.5">
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
                active ? 'border-blue-500 bg-blue-500' : 'border-slate-300 group-hover:border-blue-300'
              }`}>
                {active && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </div>
              <div className="flex items-baseline gap-2.5 flex-1">
                <span className={`text-xs font-bold w-4 shrink-0 ${active ? 'text-blue-500' : 'text-slate-400'}`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className={`text-sm leading-snug ${active ? 'text-blue-900 font-medium' : 'text-slate-700'}`}>
                  {opt.option_text}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Match pairs ───────────────────────────────────────────────────────────────
function MatchQuestion({ q, answers, onAnswer }: {
  q: Question; answers: Record<number, AnswerValue>; onAnswer: (id: number, v: AnswerValue) => void;
}) {
  const userMap: Record<number, number> = (answers[q.id] as Record<number, number> | undefined) ?? {};
  const selectRight = (leftId: number, rightId: number) => onAnswer(q.id, { ...userMap, [leftId]: rightId });

  return (
    <div className="space-y-3">
      {q.pairs.map((pair, pi) => {
        const chosen = userMap[pair.id];
        return (
          <div key={pair.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">{pi + 1}</span>
              <p className="text-sm text-slate-800 font-medium">{pair.left_text}</p>
            </div>
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {q.pairs.map(r => {
                const isChosen = chosen === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => selectRight(pair.id, r.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                      isChosen
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
                    }`}
                  >
                    {r.right_text}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Fill in the blank ─────────────────────────────────────────────────────────
function FillQuestion({ q, answers, onAnswer }: {
  q: Question; answers: Record<number, AnswerValue>; onAnswer: (id: number, v: AnswerValue) => void;
}) {
  const userAnswers: Record<number, string> = (answers[q.id] as Record<number, string> | undefined) ?? {};
  const handleChange = (blankIndex: number, value: string) => onAnswer(q.id, { ...userAnswers, [blankIndex]: value });

  return (
    <div className="space-y-3">
      {q.blanks.map(blank => (
        <div key={blank.blank_index} className="bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-300 transition-all">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
            <label className="text-xs text-slate-500 font-semibold">Blank {blank.blank_index + 1}</label>
          </div>
          <input
            type="text"
            value={userAnswers[blank.blank_index] ?? ''}
            onChange={e => handleChange(blank.blank_index, e.target.value)}
            placeholder="Type your answer here…"
            className="w-full px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none bg-white"
          />
        </div>
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function QuestionPanel({
  exam, currentIndex, answers, markedForReview,
  onAnswer, onToggleMark, onPrev, onNext, onSubmit,
}: QuestionPanelProps) {
  const q          = exam.questions[currentIndex];
  const total      = exam.questions.length;
  const typeMeta   = TYPE_META[q.qtype] ?? TYPE_META.MCQ;
  const isLast     = currentIndex === total - 1;
  const currentAnswered = isAnswered(q, answers);
  const isFlagged  = markedForReview.has(q.id);

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">

        {/* Card header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 leading-snug">
                Question {currentIndex + 1}: {q.skill || q.category}
              </h2>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${typeMeta.pill}`}>
                  {typeMeta.label}
                </span>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  {q.category}
                </span>
                {q.level && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                    {q.level}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => onToggleMark(q.id)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border transition-all duration-150 shrink-0 ${
                isFlagged
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : 'bg-white text-slate-500 border-slate-200 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill={isFlagged ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18M3 4.5h13.5l-2.25 4.5 2.25 4.5H3" />
              </svg>
              {isFlagged ? 'Flagged' : 'Flag for Review'}
            </button>
          </div>

          {typeMeta.hint && (
            <p className="text-xs text-slate-400 mt-2.5 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              {typeMeta.hint}
            </p>
          )}
        </div>

        {/* Question text + answers */}
        <div className="flex-1 px-6 py-5 overflow-y-auto space-y-5">
          <p className="text-slate-800 text-[15px] leading-relaxed font-medium">
            {q.text}
          </p>

          {q.qtype === 'MCQ'   && <McqOptions   q={q} answers={answers} onAnswer={onAnswer} />}
          {q.qtype === 'Multi' && <MultiOptions  q={q} answers={answers} onAnswer={onAnswer} />}
          {q.qtype === 'Match' && <MatchQuestion q={q} answers={answers} onAnswer={onAnswer} />}
          {q.qtype === 'Fill'  && <FillQuestion  q={q} answers={answers} onAnswer={onAnswer} />}
        </div>

        {/* Footer nav */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl
                       hover:border-slate-300 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Previous
          </button>

          <div className="flex items-center gap-2">
            {currentAnswered && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Answered
              </span>
            )}
            <span className="text-xs text-slate-400 font-medium">
              {currentIndex + 1} / {total}
            </span>
          </div>

          {isLast ? (
            <button
              onClick={onSubmit}
              className="flex items-center gap-2 px-5 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700
                         rounded-xl transition-all duration-150 font-semibold shadow-sm shadow-emerald-200"
            >
              Submit Exam
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onNext}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700
                         rounded-xl transition-all duration-150 font-medium shadow-sm shadow-blue-200"
            >
              Next
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
