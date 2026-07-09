'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CandidateInfo, ExamConfig, Violation } from '@/types';
import { useProctor } from '@/hooks/useProctor';
import { useExam } from '@/hooks/useExam';
import QuestionPanel from './QuestionPanel';
import QuestionMap from './QuestionMap';
import Timer from './Timer';
import WarningModal from './WarningModal';

interface ExamInterfaceProps {
  candidate: CandidateInfo;
  exam: ExamConfig;
  screenStream: MediaStream | null;
}

export default function ExamInterface({ candidate, exam, screenStream }: ExamInterfaceProps) {
  const examState = useExam(exam);
  const {
    currentQuestionIndex, answers, markedForReview, timeRemaining, status, score,
    setAnswer, toggleMarkForReview, goToQuestion, nextQuestion, prevQuestion, submitExam,
    startExam, getSessionData,
  } = examState;

  useEffect(() => { startExam(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [activeViolation, setActiveViolation] = useState<Violation | null>(null);
  const onNewViolation = useCallback((v: Violation) => setActiveViolation(v), []);

  const proctor = useProctor({
    enabled: status === 'in-progress',
    screenStream,
    onNewViolation,
  });

  useEffect(() => {
    if (status === 'in-progress' && proctor.violations.length >= exam.maxViolations) {
      submitExam();
    }
  }, [proctor.violations.length, exam.maxViolations, status, submitExam]);

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (liveVideoRef.current) liveVideoRef.current.srcObject = proctor.cameraStream;
  }, [proctor.cameraStream]);

  const highViolations = proctor.violations.filter(v => v.severity === 'high').length;
  const answered = Object.keys(answers).length;
  const total    = exam.questions.length;
  const eyeStable = proctor.isFullscreen && proctor.isWindowFocused;

  // ── Overlay: fullscreen required ───────────────────────────────────────────
  const FullscreenBlocker = !proctor.isFullscreen && status === 'in-progress' && (
    <div className="fixed inset-0 z-50 bg-slate-950/98 flex items-center justify-center p-8 backdrop-blur-sm">
      <div className="text-center max-w-xs">
        <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Fullscreen Required</h2>
        <p className="text-slate-400 text-sm mb-1">The exam is paused.</p>
        <p className="text-slate-500 text-xs mb-7">Each exit is recorded as a violation.</p>
        <button
          onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
          className="px-7 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-colors"
        >
          Return to Fullscreen
        </button>
      </div>
    </div>
  );

  // ── Overlay: focus loss ────────────────────────────────────────────────────
  const FocusBlocker = proctor.isFullscreen && !proctor.isWindowFocused && status === 'in-progress' && (
    <div className="fixed inset-0 z-50 bg-slate-950/98 flex items-center justify-center p-8 backdrop-blur-sm">
      <div className="text-center max-w-xs">
        <div className="w-14 h-14 bg-rose-950 rounded-2xl flex items-center justify-center mx-auto mb-5 ring-1 ring-rose-800">
          <svg className="w-7 h-7 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-rose-400 mb-2">Exam Paused</h2>
        <p className="text-slate-400 text-sm mb-1">Window lost focus — content hidden.</p>
        <p className="text-slate-500 text-xs mb-5">
          Focus loss is a <span className="text-rose-400 font-semibold">HIGH</span> severity violation.
        </p>
        <p className="text-amber-400 text-xs">Click anywhere to resume</p>
      </div>
    </div>
  );

  // ── Result screen ──────────────────────────────────────────────────────────
  if (status === 'submitted' || status === 'terminated') {
    const session    = getSessionData(candidate, proctor.violations);
    const passed     = score !== null && score >= 60;
    const terminated = status === 'terminated';

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-xl space-y-4">

          {/* Hero result card */}
          <div className={`rounded-2xl border p-8 text-center ${
            terminated ? 'bg-rose-50 border-rose-200'
            : passed   ? 'bg-gradient-to-b from-emerald-50 to-white border-emerald-200'
                       : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
              terminated ? 'bg-rose-100' : passed ? 'bg-emerald-100' : 'bg-slate-100'
            }`}>
              {terminated ? (
                <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              ) : passed ? (
                <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              )}
            </div>

            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
              {terminated ? 'Terminated' : 'Submitted'}
            </p>
            <h2 className={`text-2xl font-bold mb-2 ${terminated ? 'text-rose-700' : 'text-slate-900'}`}>
              {terminated ? 'Exam Terminated' : passed ? 'Well Done!' : 'Exam Complete'}
            </h2>
            <p className={`text-sm ${terminated ? 'text-rose-500' : 'text-slate-500'}`}>
              {terminated
                ? `Exam ended after ${exam.maxViolations} proctoring violations.`
                : 'Your responses have been recorded.'}
            </p>

            {score !== null && (
              <div className="mt-6">
                <div className="relative inline-flex">
                  <span className={`text-6xl font-bold tracking-tight ${passed ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {score}
                  </span>
                  <span className="text-2xl font-semibold text-slate-400 mt-2">%</span>
                </div>
                <div className="mt-3 flex items-center justify-center gap-3">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                    {passed ? 'PASSED' : 'FAILED'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {Object.keys(answers).length} of {total} answered
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: proctor.violations.length, label: 'Violations',    sub: 'total',    color: proctor.violations.length > 0 ? 'text-rose-600' : 'text-slate-800' },
              { value: highViolations,            label: 'High Severity', sub: 'critical', color: highViolations > 0 ? 'text-rose-600' : 'text-slate-800'              },
              { value: proctor.periodicSnapshots.length, label: 'Snapshots', sub: 'taken', color: 'text-blue-600' },
            ].map(({ value, label, sub, color }) => (
              <div key={label} className="bg-white rounded-xl p-4 text-center border border-slate-200">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-slate-600 font-medium mt-0.5">{label}</p>
                <p className="text-[10px] text-slate-400">{sub}</p>
              </div>
            ))}
          </div>

          {/* Session log */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-600">Session Data</p>
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(session, null, 2))}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                Copy JSON
              </button>
            </div>
            <pre className="text-xs text-slate-500 overflow-auto max-h-36 p-4 leading-relaxed font-mono bg-slate-50">
              {JSON.stringify({
                ...session,
                violations: `[${proctor.violations.length} entries]`,
                snapshots:  `[${proctor.periodicSnapshots.length} images]`,
              }, null, 2)}
            </pre>
          </div>

          <button
            onClick={() => window.location.href = '/'}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Main exam layout ───────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-[#F5F6FB] flex flex-col select-none overflow-hidden">
      {FullscreenBlocker}
      {FocusBlocker}

      <WarningModal
        violation={activeViolation}
        violationCount={proctor.violations.length}
        maxViolations={exam.maxViolations}
        onDismiss={() => setActiveViolation(null)}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 shrink-0 z-10">
        <div className="px-5 flex items-center justify-between gap-4" style={{ height: '60px' }}>
          {/* Left: branding + monitoring badge */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900 text-sm tracking-tight shrink-0">Pripton</span>
            <div className="h-4 w-px bg-slate-200 shrink-0 hidden sm:block" />
            <p className="text-[11px] text-slate-400 truncate hidden sm:block max-w-[220px]">{exam.name}</p>

            <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${
              proctor.isReady ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${proctor.isReady ? 'bg-blue-500 animate-pulse' : 'bg-amber-400'}`} />
              {proctor.isReady ? 'AI Monitoring Active' : 'Starting…'}
            </div>
          </div>

          {/* Right: timer + violations + submit */}
          <div className="flex items-center gap-4 shrink-0">
            <Timer timeRemaining={timeRemaining} totalDuration={exam.duration} />

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {proctor.violations.length > 0 && (
              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1">
                <svg className="w-3 h-3 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-bold text-rose-600">
                  {proctor.violations.length}/{exam.maxViolations}
                </span>
              </div>
            )}

            <button
              onClick={() => submitExam()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Submit Exam
            </button>
          </div>
        </div>

        {/* Thin progress bar */}
        <div className="h-0.5 bg-slate-100">
          <div
            className="h-full bg-blue-500 transition-all duration-700"
            style={{ width: `${(answered / total) * 100}%` }}
          />
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden">

        {/* Left sidebar: live camera + question map */}
        <aside className="w-64 xl:w-72 border-r border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto p-4 gap-4">

          {/* Camera tile */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 relative shrink-0" style={{ aspectRatio: '4/3' }}>
            <video ref={liveVideoRef} muted playsInline autoPlay
              className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            {proctor.cameraStream ? (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-rose-600/90 backdrop-blur-sm rounded-full px-2.5 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-white text-[10px] font-bold tracking-wide">CANDIDATE LIVE</span>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-slate-500 text-xs">
                  {proctor.cameraError ? 'Camera unavailable' : 'Connecting…'}
                </p>
              </div>
            )}
          </div>

          {/* Eye tracking status */}
          <div className="flex items-center justify-between shrink-0">
            <span className="text-xs font-medium text-slate-500">Eye Tracking</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              eyeStable ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {eyeStable ? 'STABLE' : 'WARNING'}
            </span>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <QuestionMap
              questions={exam.questions}
              currentIndex={currentQuestionIndex}
              answers={answers}
              markedForReview={markedForReview}
              onNavigate={goToQuestion}
            />
          </div>
        </aside>

        {/* Question area */}
        <div className="flex-1 overflow-y-auto p-5 lg:p-6">
          <QuestionPanel
            exam={exam}
            currentIndex={currentQuestionIndex}
            answers={answers}
            markedForReview={markedForReview}
            onAnswer={setAnswer}
            onToggleMark={toggleMarkForReview}
            onPrev={prevQuestion}
            onNext={nextQuestion}
            onSubmit={() => submitExam()}
          />
        </div>
      </main>
    </div>
  );
}
