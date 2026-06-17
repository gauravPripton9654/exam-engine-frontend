'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ExamConfig, CandidateInfo, Violation, AnswerValue } from '@/types';

type ExamStatus = 'setup' | 'in-progress' | 'submitted' | 'terminated';

interface UseExamReturn {
  currentQuestionIndex: number;
  answers: Record<number, AnswerValue>;
  markedForReview: Set<number>;
  timeRemaining: number;
  status: ExamStatus;
  score: number | null;
  setAnswer: (questionId: number, value: AnswerValue) => void;
  toggleMarkForReview: (questionId: number) => void;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  submitExam: () => void;
  terminateExam: () => void;
  startExam: () => void;
  getSessionData: (candidate: CandidateInfo, violations: Violation[]) => object;
}

function isCorrect(q: ExamConfig['questions'][number], answer: AnswerValue): boolean {
  if (q.qtype === 'MCQ') {
    // answer = index into q.options array
    return q.options[answer as number]?.is_correct === true;
  }

  if (q.qtype === 'Multi') {
    // answer = number[] of selected indices into q.options
    const selected = answer as number[];
    const correctCount = q.options.filter(o => o.is_correct).length;
    if (selected.length !== correctCount) return false;
    return selected.every(i => q.options[i]?.is_correct === true);
  }

  if (q.qtype === 'Match') {
    // answer = Record<pairId, selectedPairId> — user maps each left to a right
    const userMap = answer as Record<number, number>;
    return q.pairs.every(pair => userMap[pair.id] === pair.id);
  }

  if (q.qtype === 'Fill') {
    // answer = Record<blankIndex, userAnswer>
    const userAnswers = answer as Record<number, string>;
    return q.blanks.every(blank => {
      const typed = (userAnswers[blank.blank_index] ?? '').trim().toLowerCase();
      return blank.accepted_answers.map(a => a.toLowerCase()).includes(typed);
    });
  }

  return false;
}

export function useExam(config: ExamConfig): UseExamReturn {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(config.duration);
  const [status, setStatus] = useState<ExamStatus>('setup');
  const [score, setScore] = useState<number | null>(null);

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const calculateScore = useCallback((currentAnswers: Record<number, AnswerValue>) => {
    let correct = 0;
    config.questions.forEach(q => {
      const ans = currentAnswers[q.id];
      if (ans !== undefined && isCorrect(q, ans)) correct++;
    });
    return Math.round((correct / config.questions.length) * 100);
  }, [config]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const submitExam = useCallback(() => {
    stopTimer();
    setAnswers(prev => {
      const finalScore = calculateScore(prev);
      setScore(finalScore);
      return prev;
    });
    setStatus('submitted');
  }, [calculateScore, stopTimer]);

  const terminateExam = useCallback(() => {
    stopTimer();
    setAnswers(prev => {
      const finalScore = calculateScore(prev);
      setScore(finalScore);
      return prev;
    });
    setStatus('terminated');
  }, [calculateScore, stopTimer]);

  const startExam = useCallback(() => {
    startTimeRef.current = new Date();
    setStatus('in-progress');
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          stopTimer();
          submitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer, submitExam]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const setAnswer = useCallback((questionId: number, value: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }, []);

  const toggleMarkForReview = useCallback((questionId: number) => {
    setMarkedForReview(prev => {
      const next = new Set(prev);
      next.has(questionId) ? next.delete(questionId) : next.add(questionId);
      return next;
    });
  }, []);

  const goToQuestion = useCallback((i: number) => setCurrentQuestionIndex(i), []);
  const nextQuestion = useCallback(() => setCurrentQuestionIndex(p => Math.min(p + 1, config.questions.length - 1)), [config.questions.length]);
  const prevQuestion = useCallback(() => setCurrentQuestionIndex(p => Math.max(p - 1, 0)), []);

  const getSessionData = useCallback((candidate: CandidateInfo, violations: Violation[]) => ({
    sessionId: `SESSION-${Date.now()}`,
    candidate,
    examId: config.id,
    examName: config.name,
    startTime: startTimeRef.current,
    endTime: new Date(),
    answers,
    violations,
    score,
    status,
    totalQuestions: config.questions.length,
    answeredCount: Object.keys(answers).length,
    violationCount: violations.length,
  }), [answers, config, score, status]);

  return {
    currentQuestionIndex,
    answers,
    markedForReview,
    timeRemaining,
    status,
    score,
    setAnswer,
    toggleMarkForReview,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    submitExam,
    terminateExam,
    startExam,
    getSessionData,
  };
}
