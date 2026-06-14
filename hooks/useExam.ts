'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ExamConfig, CandidateInfo, Violation } from '@/types';

type ExamStatus = 'setup' | 'in-progress' | 'submitted' | 'terminated';

interface UseExamReturn {
  currentQuestionIndex: number;
  answers: Record<number, number>;
  markedForReview: Set<number>;
  timeRemaining: number;
  status: ExamStatus;
  score: number | null;
  setAnswer: (questionId: number, optionIndex: number) => void;
  toggleMarkForReview: (questionId: number) => void;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  submitExam: () => void;
  terminateExam: () => void;
  startExam: () => void;
  getSessionData: (candidate: CandidateInfo, violations: Violation[]) => object;
}

export function useExam(config: ExamConfig): UseExamReturn {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(config.duration);
  const [status, setStatus] = useState<ExamStatus>('setup');
  const [score, setScore] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const calculateScore = useCallback((currentAnswers: Record<number, number>) => {
    let correct = 0;
    config.questions.forEach(q => {
      if (currentAnswers[q.id] === q.correctAnswer) correct++;
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
    const finalScore = calculateScore(answers);
    setScore(finalScore);
    setStatus('submitted');
  }, [answers, calculateScore, stopTimer]);

  const terminateExam = useCallback(() => {
    stopTimer();
    const finalScore = calculateScore(answers);
    setScore(finalScore);
    setStatus('terminated');
  }, [answers, calculateScore, stopTimer]);

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

  const setAnswer = useCallback((questionId: number, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  }, []);

  const toggleMarkForReview = useCallback((questionId: number) => {
    setMarkedForReview(prev => {
      const next = new Set(prev);
      next.has(questionId) ? next.delete(questionId) : next.add(questionId);
      return next;
    });
  }, []);

  const goToQuestion   = useCallback((i: number) => setCurrentQuestionIndex(i), []);
  const nextQuestion   = useCallback(() => setCurrentQuestionIndex(p => Math.min(p + 1, config.questions.length - 1)), [config.questions.length]);
  const prevQuestion   = useCallback(() => setCurrentQuestionIndex(p => Math.max(p - 1, 0)), []);

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
