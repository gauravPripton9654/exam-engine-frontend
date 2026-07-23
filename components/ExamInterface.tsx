'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CandidateInfo, ExamConfig, Violation, SessionData, TranscriptStatus } from '@/types';
import { useProctor } from '@/hooks/useProctor';
import { useExam } from '@/hooks/useExam';
import { saveExamSession, transcribeSession, fetchTranscript, saveDebugAudio } from '@/lib/api';
import QuestionPanel from './QuestionPanel';
import QuestionMap from './QuestionMap';
import Timer from './Timer';
import ViolationToast from './ViolationToast';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ExamInterfaceProps {
  candidate: CandidateInfo;
  exam: ExamConfig;
  screenStream: MediaStream | null;
  audioStream: MediaStream | null;
}

export default function ExamInterface({ candidate, exam, screenStream, audioStream }: ExamInterfaceProps) {
  const examState = useExam(exam);
  const {
    currentQuestionIndex, answers, markedForReview, timeRemaining, status, score,
    setAnswer, toggleMarkForReview, goToQuestion, nextQuestion, prevQuestion, submitExam,
    startExam, getSessionData,
  } = examState;

  useEffect(() => { startExam(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [activeViolation, setActiveViolation] = useState<Violation | null>(null);
  const onNewViolation = useCallback((v: Violation) => setActiveViolation(v), []);

  const securityEnabled = exam.mode !== 'easy';
  const cameraEnabled   = exam.mode === 'hard';

  const proctor = useProctor({
    enabled:      status === 'in-progress' && securityEnabled,
    enableCamera: cameraEnabled,
    screenStream,
    audioStream,
    onNewViolation,
  });

  const highViolations = proctor.violations.filter(v => v.severity === 'high').length;
  const answered = Object.keys(answers).length;
  const total    = exam.questions.length;
  const eyeStable = proctor.isFullscreen && proctor.isWindowFocused;

  // ── Persist the finished session to the backend ────────────────────────────
  const [session, setSession] = useState<SessionData | null>(null);
  const sessionPreparedRef = useRef(false);
  const { stopAudioRecording, waitForSnapshotDetections } = proctor;

  useEffect(() => {
    if ((status !== 'submitted' && status !== 'terminated') || sessionPreparedRef.current) return;
    sessionPreparedRef.current = true;

    void waitForSnapshotDetections().then(snapshots => {
      setSession(getSessionData(candidate, proctor.violations, snapshots));
    });
  }, [status, candidate, getSessionData, proctor.violations, waitForSnapshotDetections]);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const savedSessionIdRef = useRef<string | null>(null);

  // ── Voice transcript (hard mode) — uploaded once the session row exists ────
  const [transcriptStatus, setTranscriptStatus] = useState<TranscriptStatus>('none');
  const [transcriptText, setTranscriptText] = useState<string | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttemptRef = useRef(0);

  // Stop polling if the candidate navigates away before transcription finishes.
  useEffect(() => () => {
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
  }, []);

  const pollTranscript = useCallback((sessionId: string) => {
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    pollAttemptRef.current = 0;

    const poll = () => {
      fetchTranscript(sessionId)
        .then(res => {
          setTranscriptStatus(res.transcript_status);
          setTranscriptText(res.transcript);
          setTranscriptError(res.transcript_error);
          if (res.transcript_status === 'processing' || res.transcript_status === 'none') {
            // Back off from 5s up to 20s — a slow transcription (long
            // recording, CPU-bound model) shouldn't hammer the backend
            // with a status check every few seconds.
            pollAttemptRef.current += 1;
            const delay = Math.min(5000 + pollAttemptRef.current * 2000, 20000);
            pollTimeoutRef.current = setTimeout(poll, delay);
          }
        })
        .catch(() => {
          pollTimeoutRef.current = setTimeout(poll, 10000);
        });
    };
    poll();
  }, []);

  const persistSession = useCallback((s: SessionData) => {
    setSaveStatus('saving');
    saveExamSession(s)
      .then(async () => {
        setSaveStatus('saved');
        if (!cameraEnabled) return;
        // Stops the (single, continuous) mic recording and waits for the
        // whole exam's audio to come back as one Blob before uploading —
        // this can take a moment on a long exam, unlike the old chunked
        // approach which had something ready instantly.
        const blob = await stopAudioRecording();
        if (!blob) return;
        // Debug aid: also save a copy locally so what the mic actually
        // captured can be listened to directly (see app/api/debug-audio).
        saveDebugAudio(blob, `${s.sessionId}.webm`).catch(() => {});
        setTranscriptStatus('processing');
        transcribeSession(s.sessionId, blob)
          .then(() => pollTranscript(s.sessionId))
          .catch(() => setTranscriptStatus('failed'));
      })
      .catch(() => setSaveStatus('error'));
  }, [cameraEnabled, stopAudioRecording, pollTranscript]);

  useEffect(() => {
    if (!session || savedSessionIdRef.current === session.sessionId) return;
    savedSessionIdRef.current = session.sessionId;
    persistSession(session);
  }, [session, persistSession]);

  // ── Result screen ──────────────────────────────────────────────────────────
  if ((status === 'submitted' || status === 'terminated') && !session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-700">Finalizing proctoring checks…</p>
        </div>
      </div>
    );
  }

  if ((status === 'submitted' || status === 'terminated') && session) {
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
                ? 'Exam was terminated.'
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
          <div className={`grid gap-3 ${cameraEnabled ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-3'}`}>
            {[
              { value: proctor.violations.length, label: 'Violations',    sub: 'total',    color: proctor.violations.length > 0 ? 'text-rose-600' : 'text-slate-800' },
              { value: highViolations,            label: 'High Severity', sub: 'critical', color: highViolations > 0 ? 'text-rose-600' : 'text-slate-800'              },
              ...(cameraEnabled ? [
                { value: proctor.periodicSnapshots.length,       label: 'Snapshots', sub: 'taken', color: 'text-blue-600' },
                { value: proctor.audioReady ? 'Yes' : 'No', label: 'Voice Recorded', sub: 'mic audio', color: 'text-blue-600' },
              ] : []),
              { value: session.activityLog.length, label: 'Activity Events', sub: 'logged', color: 'text-blue-600' },
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
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-slate-600">Session Data</p>
                {saveStatus === 'saving' && (
                  <span className="text-[10px] text-amber-600 font-medium">Saving to server…</span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-[10px] text-emerald-600 font-medium">Saved to server ✓</span>
                )}
                {saveStatus === 'error' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-rose-600 font-medium">Failed to save</span>
                    <button
                      onClick={() => persistSession(session)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
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
                violations:  `[${proctor.violations.length} entries]`,
                snapshots:   `[${proctor.periodicSnapshots.length} images]`,
                activityLog: `[${session.activityLog.length} events]`,
              }, null, 2)}
            </pre>
          </div>

          {/* Voice transcript (hard mode) */}
          {cameraEnabled && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-600">Voice Transcript</p>
              </div>
              <div className="p-4">
                {transcriptStatus === 'none' && (
                  <p className="text-xs text-slate-400">No microphone audio was captured.</p>
                )}
                {transcriptStatus === 'processing' && (
                  <div className="flex items-center gap-2 text-xs text-amber-600">
                    <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    Transcribing…
                  </div>
                )}
                {transcriptStatus === 'done' && (
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {transcriptText || 'No speech detected.'}
                  </p>
                )}
                {transcriptStatus === 'failed' && (
                  <p className="text-xs text-rose-600">
                    Transcription failed{transcriptError ? `: ${transcriptError}` : '.'}
                  </p>
                )}
              </div>
            </div>
          )}

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
    <div className={`h-screen bg-[#F5F6FB] flex flex-col overflow-hidden ${securityEnabled ? 'select-none' : ''}`}>
      <ViolationToast
        violation={activeViolation}
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

            {securityEnabled && (
              <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${
                proctor.isReady ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${proctor.isReady ? 'bg-blue-500 animate-pulse' : 'bg-amber-400'}`} />
                {proctor.isReady ? 'AI Monitoring Active' : 'Starting…'}
              </div>
            )}
          </div>

          {/* Right: timer + violations + submit */}
          <div className="flex items-center gap-4 shrink-0">
            <Timer timeRemaining={timeRemaining} totalDuration={exam.duration} />

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {securityEnabled && proctor.violations.length > 0 && (
              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1">
                <svg className="w-3 h-3 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-bold text-rose-600">
                  {proctor.violations.length} violation{proctor.violations.length === 1 ? '' : 's'}
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

        {/* Left sidebar: monitoring status + question map */}
        <aside className="w-64 xl:w-72 border-r border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto p-4 gap-4">

          {/* Eye tracking status */}
          {securityEnabled && (
            <div className="flex items-center justify-between shrink-0">
              <span className="text-xs font-medium text-slate-500">Eye Tracking</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                eyeStable ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {eyeStable ? 'STABLE' : 'WARNING'}
              </span>
            </div>
          )}

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
