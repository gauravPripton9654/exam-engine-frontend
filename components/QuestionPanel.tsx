'use client';

import { ExamConfig, Question } from '@/types';

interface QuestionPanelProps {
  exam: ExamConfig;
  currentIndex: number;
  answers: Record<number, number>;
  markedForReview: Set<number>;
  onAnswer: (questionId: number, optionIndex: number) => void;
  onToggleMark: (questionId: number) => void;
  onNavigate: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

function getNavStyle(
  q: Question,
  index: number,
  current: number,
  answers: Record<number, number>,
  marked: Set<number>
): string {
  const base = 'w-8 h-8 rounded-lg text-xs font-semibold transition-all border ';
  if (index === current)       return base + 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/50';
  if (marked.has(q.id))       return base + 'bg-purple-900 border-purple-600 text-purple-200';
  if (answers[q.id] !== undefined) return base + 'bg-green-900 border-green-600 text-green-200';
  return base + 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400';
}

export default function QuestionPanel({
  exam, currentIndex, answers, markedForReview,
  onAnswer, onToggleMark, onNavigate, onPrev, onNext, onSubmit,
}: QuestionPanelProps) {
  const q = exam.questions[currentIndex];
  const answered    = Object.keys(answers).length;
  const marked      = markedForReview.size;
  const unanswered  = exam.questions.length - answered;

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
              className={getNavStyle(question, i, currentIndex, answers, markedForReview)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Current Question */}
      <div className="flex-1 bg-gray-800/50 rounded-xl border border-gray-700 p-5 flex flex-col">
        {/* Question header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs text-blue-400 font-medium bg-blue-900/40 px-2 py-0.5 rounded">
              {q.category}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              Question {currentIndex + 1} of {exam.questions.length}
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

        {/* Question text */}
        <p className="text-gray-100 text-base leading-relaxed mb-6 font-medium">
          {q.text}
        </p>

        {/* Options */}
        <div className="space-y-3 flex-1">
          {q.options.map((option, idx) => {
            const isSelected = answers[q.id] === idx;
            return (
              <button
                key={idx}
                onClick={() => onAnswer(q.id, idx)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-blue-900/60 border-blue-500 text-blue-100 shadow shadow-blue-900/50'
                    : 'bg-gray-700/40 border-gray-600 text-gray-300 hover:border-gray-400 hover:bg-gray-700/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-blue-400 bg-blue-500' : 'border-gray-500'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm">
                    <span className="font-semibold mr-2 text-gray-400">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {option}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

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
                className="px-4 py-2 text-sm bg-blue-700 border border-blue-500 text-white rounded-lg
                           hover:bg-blue-600 transition-all"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={onSubmit}
                className="px-6 py-2 text-sm bg-green-700 border border-green-500 text-white rounded-lg
                           hover:bg-green-600 transition-all font-semibold"
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
