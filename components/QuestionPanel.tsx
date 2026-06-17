'use client';

import { ExamConfig, Question, AnswerValue } from '@/types';

interface QuestionPanelProps {
  exam: ExamConfig;
  currentIndex: number;
  answers: Record<number, AnswerValue>;
  markedForReview: Set<number>;
  onAnswer: (questionId: number, value: AnswerValue) => void;
  onToggleMark: (questionId: number) => void;
  onNavigate: (index: number) => void;
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

function navStyle(q: Question, index: number, current: number, answers: Record<number, AnswerValue>, marked: Set<number>) {
  const base = 'w-8 h-8 rounded-lg text-xs font-semibold transition-all border ';
  if (index === current)          return base + 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/50';
  if (marked.has(q.id))          return base + 'bg-purple-900 border-purple-600 text-purple-200';
  if (isAnswered(q, answers))    return base + 'bg-green-900 border-green-600 text-green-200';
  return base + 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400';
}

// ── MCQ ───────────────────────────────────────────────────────────────────────
function McqOptions({ q, answers, onAnswer }: { q: Question; answers: Record<number, AnswerValue>; onAnswer: (id: number, v: AnswerValue) => void }) {
  const selected = answers[q.id] as number | undefined;
  return (
    <div className="space-y-3 flex-1">
      {q.options.map((opt, idx) => {
        const active = selected === idx;
        return (
          <button
            key={opt.id}
            onClick={() => onAnswer(q.id, idx)}
            className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
              active
                ? 'bg-blue-900/60 border-blue-500 text-blue-100 shadow shadow-blue-900/50'
                : 'bg-gray-700/40 border-gray-600 text-gray-300 hover:border-gray-400 hover:bg-gray-700/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? 'border-blue-400 bg-blue-500' : 'border-gray-500'}`}>
                {active && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <span className="text-sm">
                <span className="font-semibold mr-2 text-gray-400">{String.fromCharCode(65 + idx)}.</span>
                {opt.option_text}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Multi-select ──────────────────────────────────────────────────────────────
function MultiOptions({ q, answers, onAnswer }: { q: Question; answers: Record<number, AnswerValue>; onAnswer: (id: number, v: AnswerValue) => void }) {
  const selected: number[] = (answers[q.id] as number[] | undefined) ?? [];

  const toggle = (idx: number) => {
    const next = selected.includes(idx) ? selected.filter(i => i !== idx) : [...selected, idx];
    onAnswer(q.id, next);
  };

  return (
    <div className="space-y-3 flex-1">
      <p className="text-xs text-yellow-400 bg-yellow-900/30 border border-yellow-700 rounded-lg px-3 py-1.5">
        Select <strong>all</strong> correct answers
      </p>
      {q.options.map((opt, idx) => {
        const active = selected.includes(idx);
        return (
          <button
            key={opt.id}
            onClick={() => toggle(idx)}
            className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
              active
                ? 'bg-blue-900/60 border-blue-500 text-blue-100'
                : 'bg-gray-700/40 border-gray-600 text-gray-300 hover:border-gray-400 hover:bg-gray-700/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${active ? 'border-blue-400 bg-blue-500' : 'border-gray-500'}`}>
                {active && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-sm">
                <span className="font-semibold mr-2 text-gray-400">{String.fromCharCode(65 + idx)}.</span>
                {opt.option_text}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Match pairs ───────────────────────────────────────────────────────────────
function MatchQuestion({ q, answers, onAnswer }: { q: Question; answers: Record<number, AnswerValue>; onAnswer: (id: number, v: AnswerValue) => void }) {
  const userMap: Record<number, number> = (answers[q.id] as Record<number, number> | undefined) ?? {};


  const selectRight = (leftPairId: number, rightPairId: number) => {
    const next = { ...userMap, [leftPairId]: rightPairId };
    onAnswer(q.id, next);
  };

  return (
    <div className="flex-1 space-y-3">
      <p className="text-xs text-blue-300 bg-blue-900/30 border border-blue-700 rounded-lg px-3 py-1.5">
        Match each item on the left with the correct item on the right
      </p>
      {q.pairs.map(pair => {
        const chosen = userMap[pair.id];
        return (
          <div key={pair.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-3">
            <p className="text-sm text-white font-medium mb-2">{pair.left_text}</p>
            <div className="flex flex-wrap gap-2">
              {q.pairs.map(r => {
                const isChosen = chosen === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => selectRight(pair.id, r.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                      isChosen
                        ? 'bg-blue-700 border-blue-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-400'
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
function FillQuestion({ q, answers, onAnswer }: { q: Question; answers: Record<number, AnswerValue>; onAnswer: (id: number, v: AnswerValue) => void }) {
  const userAnswers: Record<number, string> = (answers[q.id] as Record<number, string> | undefined) ?? {};

  const handleChange = (blankIndex: number, value: string) => {
    const next = { ...userAnswers, [blankIndex]: value };
    onAnswer(q.id, next);
  };

  return (
    <div className="flex-1 space-y-4">
      <p className="text-xs text-purple-300 bg-purple-900/30 border border-purple-700 rounded-lg px-3 py-1.5">
        Type your answer for each blank
      </p>
      {q.blanks.map(blank => (
        <div key={blank.blank_index}>
          <label className="text-xs text-gray-400 font-medium block mb-1">
            Blank {blank.blank_index + 1}
          </label>
          <input
            type="text"
            value={userAnswers[blank.blank_index] ?? ''}
            onChange={e => handleChange(blank.blank_index, e.target.value)}
            placeholder="Type your answer…"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white
                       placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      ))}
    </div>
  );
}

// ── Type badge ────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  MCQ:   { label: 'Single Choice',   color: 'bg-blue-900/40 text-blue-400' },
  Multi: { label: 'Multi-Select',    color: 'bg-yellow-900/40 text-yellow-400' },
  Match: { label: 'Match the Pairs', color: 'bg-teal-900/40 text-teal-400' },
  Fill:  { label: 'Fill in Blank',   color: 'bg-purple-900/40 text-purple-400' },
};

// ── Main panel ────────────────────────────────────────────────────────────────
export default function QuestionPanel({
  exam, currentIndex, answers, markedForReview,
  onAnswer, onToggleMark, onNavigate, onPrev, onNext, onSubmit,
}: QuestionPanelProps) {
  const q = exam.questions[currentIndex];
  const answered   = exam.questions.filter(qn => isAnswered(qn, answers)).length;
  const marked     = markedForReview.size;
  const unanswered = exam.questions.length - answered;
  const typeInfo   = TYPE_LABELS[q.qtype] ?? TYPE_LABELS.MCQ;

  return (
    <div className="flex flex-col h-full">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-400 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-900 border border-green-600" />
          <span>Answered ({answered})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gray-800 border border-gray-600" />
          <span>Not Answered ({unanswered})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-purple-900 border border-purple-600" />
          <span>Review ({marked})</span>
        </div>
      </div>

      {/* Question navigation grid */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {exam.questions.map((question, i) => (
            <button
              key={question.id}
              onClick={() => onNavigate(i)}
              className={navStyle(question, i, currentIndex, answers, markedForReview)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Current question card */}
      <div className="flex-1 bg-gray-800/50 rounded-xl border border-gray-700 p-5 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
            <span className="text-xs text-blue-400 font-medium bg-blue-900/40 px-2 py-0.5 rounded">
              {q.category}
            </span>
            {q.level && (
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
                {q.level}
              </span>
            )}
            <span className="text-xs text-gray-500">
              Q {currentIndex + 1} / {exam.questions.length}
            </span>
          </div>
          <button
            onClick={() => onToggleMark(q.id)}
            className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
              markedForReview.has(q.id)
                ? 'bg-purple-900 border-purple-600 text-purple-300'
                : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-purple-600 hover:text-purple-400'
            }`}
          >
            {markedForReview.has(q.id) ? '★ Marked' : '☆ Mark for Review'}
          </button>
        </div>

        {/* Question stem */}
        <p className="text-gray-100 text-base leading-relaxed mb-5 font-medium">
          {q.text}
        </p>

        {/* Answer UI per type */}
        {q.qtype === 'MCQ'   && <McqOptions   q={q} answers={answers} onAnswer={onAnswer} />}
        {q.qtype === 'Multi' && <MultiOptions q={q} answers={answers} onAnswer={onAnswer} />}
        {q.qtype === 'Match' && <MatchQuestion q={q} answers={answers} onAnswer={onAnswer} />}
        {q.qtype === 'Fill'  && <FillQuestion  q={q} answers={answers} onAnswer={onAnswer} />}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-700">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-sm bg-gray-700 border border-gray-600 text-gray-300 rounded-lg
                       hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ← Previous
          </button>

          <div className="flex gap-2">
            {currentIndex < exam.questions.length - 1 ? (
              <button
                onClick={onNext}
                className="px-4 py-2 text-sm bg-blue-700 border border-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={onSubmit}
                className="px-6 py-2 text-sm bg-green-700 border border-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-semibold"
              >
                Submit Exam
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
