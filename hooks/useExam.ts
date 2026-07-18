'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ExamConfig, CandidateInfo, Violation, PeriodicSnapshot, AnswerValue, ActivityEvent, ActivityEventType, SessionData } from '@/types';
import { isCorrect } from '@/lib/grading';

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
  getSessionData: (candidate: CandidateInfo, violations: Violation[], snapshots?: PeriodicSnapshot[]) => SessionData;
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

  // Detailed per-action analytics — only collected in medium/hard mode.
  const trackActivity  = config.mode !== 'easy';
  const activityLogRef = useRef<ActivityEvent[]>([]);

  const logActivity = useCallback((type: ActivityEventType, questionId?: number, details?: Record<string, unknown>) => {
    if (!trackActivity) return;
    activityLogRef.current.push({
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      timestamp: new Date(),
      questionId,
      details,
    });
  }, [trackActivity]);

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
    logActivity('exam_submitted');
    setStatus('submitted');
  }, [calculateScore, stopTimer, logActivity]);

  const terminateExam = useCallback(() => {
    stopTimer();
    setAnswers(prev => {
      const finalScore = calculateScore(prev);
      setScore(finalScore);
      return prev;
    });
    logActivity('exam_terminated');
    setStatus('terminated');
  }, [calculateScore, stopTimer, logActivity]);

  const startExam = useCallback(() => {
    startTimeRef.current = new Date();
    setStatus('in-progress');
    logActivity('exam_started');
    logActivity('question_viewed', config.questions[0]?.id, { index: 0 });
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
  }, [stopTimer, submitExam, logActivity, config.questions]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const setAnswer = useCallback((questionId: number, value: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    logActivity('answer_changed', questionId, { value });
  }, [logActivity]);

  const toggleMarkForReview = useCallback((questionId: number) => {
    const willMark = !markedForReview.has(questionId);
    setMarkedForReview(prev => {
      const next = new Set(prev);
      willMark ? next.add(questionId) : next.delete(questionId);
      return next;
    });
    logActivity(willMark ? 'marked_for_review' : 'unmarked_for_review', questionId);
  }, [markedForReview, logActivity]);

  const goToQuestion = useCallback((i: number) => {
    setCurrentQuestionIndex(i);
    logActivity('question_viewed', config.questions[i]?.id, { index: i });
  }, [config.questions, logActivity]);

  const nextQuestion = useCallback(() => {
    const next = Math.min(currentQuestionIndex + 1, config.questions.length - 1);
    setCurrentQuestionIndex(next);
    logActivity('question_viewed', config.questions[next]?.id, { index: next });
  }, [currentQuestionIndex, config.questions, logActivity]);

  const prevQuestion = useCallback(() => {
    const prev = Math.max(currentQuestionIndex - 1, 0);
    setCurrentQuestionIndex(prev);
    logActivity('question_viewed', config.questions[prev]?.id, { index: prev });
  }, [currentQuestionIndex, config.questions, logActivity]);

  const getSessionData = useCallback((
    candidate: CandidateInfo,
    violations: Violation[],
    snapshots: PeriodicSnapshot[] = []
  ): SessionData => ({
    sessionId: `SESSION-${Date.now()}`,
    candidate,
    examId: config.id,
    examName: config.name,
    examMode: config.mode,
    startTime: startTimeRef.current,
    endTime: new Date(),
    answers,
    violations,
    snapshots,
    activityLog: activityLogRef.current,
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
