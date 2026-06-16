'use client';

import { useState, useCallback, useEffect } from 'react';
import { CandidateInfo, ExamConfig, Violation } from '@/types';
import { useProctor } from '@/hooks/useProctor';
import { useExam } from '@/hooks/useExam';
import QuestionPanel from './QuestionPanel';
import ViolationLog from './ViolationLog';
import Timer from './Timer';
import WarningModal from './WarningModal';

interface ExamInterfaceProps {
  candidate: CandidateInfo;
  exam: ExamConfig;
}

type RightTab = 'violations' | 'snapshots';

export default function ExamInterface({ candidate, exam }: ExamInterfaceProps) {
  const [latestViolation, setLatestViolation] = useState<Violation | null>(null);
  const [showWarning, setShowWarning]         = useState(false);
  const [rightTab, setRightTab]               = useState<RightTab>('violations');

  const examState = useExam(exam);
  const {
    currentQuestionIndex, answers, markedForReview, timeRemaining, status, score,
    setAnswer, toggleMarkForReview, goToQuestion, nextQuestion, prevQuestion, submitExam,
    startExam, getSessionData,
  } = examState;

  useEffect(() => {
    startExam();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewViolation = useCallback((v: Violation) => {
    if (v.severity === 'high' || v.severity === 'medium') {
      setLatestViolation(v);
      setShowWarning(true);
    }
  }, []);

  const proctor = useProctor({
    enabled: status === 'in-progress',
    onNewViolation: handleNewViolation,
  });

  // Auto-submit when violation threshold is hit
  useEffect(() => {
    if (status === 'in-progress' && proctor.violations.length >= exam.maxViolations) {
      submitExam();
    }
  }, [proctor.violations.length, exam.maxViolations, status, submitExam]);

  const highViolations = proctor.violations.filter(v => v.severity === 'high').length;

  // ── Result screen ─────────────────────────────────────────────────────────────
  if (status === 'submitted' || status === 'terminated') {
    const session = getSessionData(candidate, proctor.violations);
    const passed  = score !== null && score >= 60;

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-gray-900 rounded-2xl border border-gray-700 p-8">
          <div className="text-center mb-8">
            {status === 'terminated' ? (
              <>
                <div className="text-6xl mb-4">🚫</div>
                <h2 className="text-2xl font-bold text-red-400">Exam Terminated</h2>
                <p className="text-gray-400 mt-2">
                  Terminated due to {exam.maxViolations}+ proctoring violations.
                </p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">{passed ? '🎉' : '📋'}</div>
                <h2 className="text-2xl font-bold text-white">Exam Submitted</h2>
                <p className="text-gray-400 mt-2">Your responses have been recorded.</p>
              </>
            )}
          </div>

          <div className={`rounded-xl border p-6 mb-6 text-center ${
            passed ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'
          }`}>
            <p className="text-gray-400 text-sm mb-1">Your Score</p>
            <p className={`text-5xl font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>{score}%</p>
            <p className={`text-sm mt-2 ${passed ? 'text-green-300' : 'text-red-300'}`}>
              {passed ? 'PASSED' : 'FAILED'} — {Object.keys(answers).length} / {exam.questions.length} answered
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700">
              <p className="text-2xl font-bold text-white">{proctor.violations.length}</p>
              <p className="text-xs text-gray-400 mt-1">Total Violations</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700">
              <p className="text-2xl font-bold text-red-400">{highViolations}</p>
              <p className="text-xs text-gray-400 mt-1">High Severity</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700">
              <p className="text-2xl font-bold text-blue-400">{proctor.periodicSnapshots.length}</p>
              <p className="text-xs text-gray-400 mt-1">Snapshots Taken</p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 font-semibold">Session Log (Ready for DB)</p>
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(session, null, 2))}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Copy JSON
              </button>
            </div>
            <pre className="text-xs text-gray-300 overflow-auto max-h-40 leading-relaxed">
              {JSON.stringify({
                ...session,
                violations: `[${proctor.violations.length} entries]`,
                snapshots:  `[${proctor.periodicSnapshots.length} images]`,
              }, null, 2)}
            </pre>
          </div>

          <button
            onClick={() => window.location.href = '/'}
            className="w-full mt-6 py-3 bg-blue-700 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Main exam layout ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col select-none">
      {/* Fullscreen blocker — shown whenever the exam is in-progress but not fullscreen */}
      {!proctor.isFullscreen && status === 'in-progress' && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center text-center p-8">
          <div className="text-6xl mb-5">⛶</div>
          <h2 className="text-2xl font-bold text-white mb-2">Fullscreen Required</h2>
          <p className="text-gray-400 text-sm mb-1">You exited fullscreen. The exam is paused.</p>
          <p className="text-gray-500 text-xs mb-8">Return to fullscreen to continue. Each exit is a violation.</p>
          <button
            onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
            className="px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg transition-colors"
          >
            Return to Fullscreen
          </button>
        </div>
      )}

      {showWarning && latestViolation && (
        <WarningModal
          violation={latestViolation}
          violationCount={proctor.violations.length}
          maxViolations={exam.maxViolations}
          onDismiss={() => { setShowWarning(false); setLatestViolation(null); }}
        />
      )}

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center justify-between shrink-0 z-10">
        <div>
          <h1 className="text-sm font-bold text-white">{exam.name}</h1>
          <p className="text-xs text-gray-400">Candidate: {candidate.name} · {candidate.id}</p>
        </div>

        <div className="flex items-center gap-5">
          <Timer timeRemaining={timeRemaining} totalDuration={exam.duration} />

          {/* Camera / snapshot status */}
          <div className="flex items-center gap-1.5">
            {proctor.cameraError ? (
              <>
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-xs text-yellow-400">Cam unavailable</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-gray-400">
                  REC · {proctor.periodicSnapshots.length} snap{proctor.periodicSnapshots.length !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${proctor.isReady ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className="text-xs text-gray-400">
              {proctor.isReady ? 'Monitoring Active' : 'Initializing...'}
            </span>
          </div>

          <button
            onClick={() => { if (confirm('Are you sure you want to submit the exam?')) submitExam(); }}
            className="px-4 py-1.5 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-lg border border-green-500 transition-colors"
          >
            Submit
          </button>

          {proctor.violations.length > 0 && (
            <div className="flex items-center gap-1.5 bg-red-900/40 border border-red-700 rounded-lg px-2.5 py-1">
              <span className="text-red-400 text-xs font-bold">
                {proctor.violations.length} / {exam.maxViolations}
              </span>
              <span className="text-red-500 text-xs">violations</span>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex gap-0 overflow-hidden">
        {/* Questions */}
        <div className="flex-1 p-5 overflow-y-auto">
          <QuestionPanel
            exam={exam}
            currentIndex={currentQuestionIndex}
            answers={answers}
            markedForReview={markedForReview}
            onAnswer={setAnswer}
            onToggleMark={toggleMarkForReview}
            onNavigate={goToQuestion}
            onPrev={prevQuestion}
            onNext={nextQuestion}
            onSubmit={() => { if (confirm('Submit exam?')) submitExam(); }}
          />
        </div>

        {/* Right panel: Violations | Snapshots */}
        <div className="w-80 xl:w-96 border-l border-gray-700 flex flex-col bg-gray-900 shrink-0">
          {/* Tab header */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setRightTab('violations')}
              className={`relative flex-1 py-2.5 text-xs font-semibold transition-colors ${
                rightTab === 'violations'
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-950/30'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Violations
              {proctor.violations.length > 0 && (
                <span className="absolute -top-1 right-3 w-4 h-4 bg-red-600 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                  {proctor.violations.length > 9 ? '9+' : proctor.violations.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setRightTab('snapshots')}
              className={`relative flex-1 py-2.5 text-xs font-semibold transition-colors ${
                rightTab === 'snapshots'
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-950/30'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Snapshots
              {proctor.periodicSnapshots.length > 0 && (
                <span className="absolute -top-1 right-3 w-4 h-4 bg-blue-600 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                  {proctor.periodicSnapshots.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-3">
            {rightTab === 'violations' ? (
              <ViolationLog violations={proctor.violations} />
            ) : (
              <div className="space-y-3">
                {proctor.cameraError && (
                  <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
                    <p className="text-yellow-300 text-xs">{proctor.cameraError}</p>
                  </div>
                )}

                {proctor.periodicSnapshots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-gray-500 text-xs">No snapshots yet.</p>
                    <p className="text-gray-600 text-xs mt-1">First snapshot in 2 minutes.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {[...proctor.periodicSnapshots].reverse().map(snap => (
                      <div key={snap.id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                        <img
                          src={snap.image}
                          alt={`Snapshot at ${snap.timestamp.toLocaleTimeString()}`}
                          className="w-full object-cover"
                          style={{ transform: 'scaleX(-1)' }}
                        />
                        <p className="text-center text-gray-400 text-[10px] py-1">
                          {snap.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
