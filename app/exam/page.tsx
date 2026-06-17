'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { fetchCurriculum, fetchQuestions } from '@/lib/api';
import { CandidateInfo, ExamConfig, ApiQuestion, Question } from '@/types';

const ExamInterface = dynamic(() => import('@/components/ExamInterface'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading exam…</p>
      </div>
    </div>
  ),
});

type CameraStatus  = 'idle' | 'checking' | 'granted' | 'denied';
type MonitorStatus = 'unchecked' | 'ok' | 'extra_detected';

function toRuntimeQuestion(q: ApiQuestion): Question {
  return {
    id: q.id,
    qtype: q.qtype,
    text: q.stem,
    category: q.subject,
    skill: q.skill,
    level: q.level,
    options: [...q.mcq_options].sort((a, b) => a.sort_order - b.sort_order),
    pairs: [...q.match_pairs].sort((a, b) => a.sort_order - b.sort_order),
    blanks: [...q.fill_blanks].sort((a, b) => a.sort_order - b.sort_order),
  };
}

function ExamPageContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [candidate, setCandidate]         = useState<CandidateInfo | null>(null);
  const [examConfig, setExamConfig]       = useState<ExamConfig | null>(null);
  const [loadingExam, setLoadingExam]     = useState(true);
  const [examError, setExamError]         = useState<string | null>(null);
  const [started, setStarted]             = useState(false);
  const [cameraStatus, setCameraStatus]   = useState<CameraStatus>('idle');
  const [isMobile, setIsMobile]           = useState(false);
  const [monitorStatus, setMonitorStatus] = useState<MonitorStatus>('unchecked');
  const [declarations, setDeclarations]   = useState({
    noExternalKeyboard: false,
    noBackgroundApps:   false,
  });

  const previewVideoRef  = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    setIsMobile(mobileUA || window.innerWidth < 1024);
  }, []);

  // Parse candidate info and load curriculum + questions
  useEffect(() => {
    const name         = searchParams.get('name');
    const email        = searchParams.get('email') ?? '';
    const curriculumId = searchParams.get('curriculumId');

    if (!name || !curriculumId) { router.push('/'); return; }

    setCandidate({ name, id: curriculumId, email });

    const id = Number(curriculumId);
    Promise.all([fetchCurriculum(id), fetchQuestions(id)])
      .then(([curriculum, apiQuestions]) => {
        const questions = apiQuestions
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(toRuntimeQuestion);
        setExamConfig({
          id: String(curriculum.id),
          name: `${curriculum.title} — ${curriculum.role} @ ${curriculum.company}`,
          duration: 60 * 60,
          maxViolations: 5,
          questions,
        });
      })
      .catch(() => setExamError('Failed to load exam questions. Please go back and try again.'))
      .finally(() => setLoadingExam(false));
  }, [searchParams, router]);

  useEffect(() => {
    return () => { previewStreamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const requestCamera = async () => {
    setCameraStatus('checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      previewStreamRef.current = stream;
      if (previewVideoRef.current) previewVideoRef.current.srcObject = stream;
      setCameraStatus('granted');
    } catch {
      setCameraStatus('denied');
    }
  };

  const runMonitorCheck = useCallback(() => {
    const extended = ('isExtended' in window.screen)
      ? (window.screen as typeof window.screen & { isExtended: boolean }).isExtended === true
      : false;
    setMonitorStatus(extended ? 'extra_detected' : 'ok');
  }, []);

  useEffect(() => {
    if (cameraStatus === 'granted') runMonitorCheck();
  }, [cameraStatus, runMonitorCheck]);

  const systemCheckPassed =
    monitorStatus === 'ok' &&
    declarations.noExternalKeyboard &&
    declarations.noBackgroundApps;

  const canStart = cameraStatus === 'granted' && systemCheckPassed;

  const handleStart = () => {
    previewStreamRef.current?.getTracks().forEach(t => t.stop());
    previewStreamRef.current = null;
    document.documentElement
      .requestFullscreen?.()
      .catch(() => {})
      .finally(() => setStarted(true));
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-7xl mb-6">💻</div>
        <h1 className="text-2xl font-bold text-white mb-3">Desktop Required</h1>
        <p className="text-gray-400 text-sm max-w-xs">
          This exam must be taken on a <span className="text-white font-medium">laptop or desktop computer</span>.
        </p>
      </div>
    );
  }

  if (loadingExam) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading exam questions…</p>
      </div>
    );
  }

  if (examError || !examConfig || !candidate) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-5xl">⚠️</div>
        <p className="text-red-400 font-medium">{examError ?? 'Something went wrong.'}</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          ← Go Back
        </button>
      </div>
    );
  }

  if (started) return <ExamInterface candidate={candidate} exam={examConfig} />;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-gray-900 rounded-2xl border border-gray-700 p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-white">{examConfig.name}</h2>
          <p className="text-gray-400 mt-1 text-sm">Welcome, {candidate.name}</p>
        </div>

        {/* Exam details */}
        <div className="space-y-2 mb-6">
          {[
            ['Questions',      `${examConfig.questions.length}`],
            ['Duration',       `${examConfig.duration / 60} minutes`],
            ['Max Violations', `${examConfig.maxViolations} — exam auto-submits after this`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400 text-sm">{label}</span>
              <span className="text-white text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Camera */}
        <div className="mb-5">
          <StepHeader step={1} done={cameraStatus === 'granted'} label="Camera Access" />

          {cameraStatus === 'idle' && (
            <div className="bg-gray-800 border border-gray-600 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-3">
                Camera access is <span className="text-white font-medium">required</span> to start.
                A snapshot is taken every 2 minutes for proctoring.
              </p>
              <button
                onClick={requestCamera}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Grant Camera Access
              </button>
            </div>
          )}

          {cameraStatus === 'checking' && (
            <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-gray-300 text-sm">Requesting camera access…</p>
            </div>
          )}

          {cameraStatus === 'granted' && (
            <div className="bg-gray-800 border border-green-700 rounded-xl overflow-hidden">
              <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={previewVideoRef}
                  muted playsInline autoPlay
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 rounded-full px-2 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-white text-[10px] font-medium">Camera Ready</span>
                </div>
              </div>
              <div className="px-3 py-2">
                <p className="text-green-400 text-xs font-medium">✓ Camera access granted</p>
              </div>
            </div>
          )}

          {cameraStatus === 'denied' && (
            <div className="bg-red-900/20 border border-red-700 rounded-xl p-4">
              <p className="text-red-400 text-sm font-semibold mb-1">Camera Access Denied</p>
              <p className="text-red-300/70 text-xs mb-3">
                Allow camera access in your browser settings and try again.
              </p>
              <button
                onClick={requestCamera}
                className="w-full py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Step 2: System check */}
        <div className={`mb-5 transition-opacity ${cameraStatus === 'granted' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <StepHeader step={2} done={systemCheckPassed} label="System Check" />

          <div className="space-y-3">
            <div className={`rounded-xl border p-3 ${
              monitorStatus === 'extra_detected'
                ? 'bg-red-900/20 border-red-700'
                : monitorStatus === 'ok'
                ? 'bg-gray-800 border-gray-600'
                : 'bg-gray-800 border-gray-700'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🖥</span>
                  <div>
                    <p className="text-xs font-semibold text-white">Display Check</p>
                    {monitorStatus === 'unchecked' && <p className="text-xs text-gray-400">Checking for extra monitors…</p>}
                    {monitorStatus === 'ok'         && <p className="text-xs text-green-400">✓ Single display detected</p>}
                    {monitorStatus === 'extra_detected' && <p className="text-xs text-red-400">Extra monitor detected — please disconnect it</p>}
                  </div>
                </div>
                {monitorStatus !== 'unchecked' && (
                  <button onClick={runMonitorCheck} className="text-xs text-blue-400 hover:text-blue-300 underline shrink-0 ml-2">
                    Re-check
                  </button>
                )}
              </div>
              {monitorStatus === 'extra_detected' && (
                <p className="text-red-300/70 text-xs mt-2">
                  Disconnect the extra monitor, then click <strong>Re-check</strong>.
                </p>
              )}
            </div>

            {monitorStatus === 'ok' && (
              <div className="bg-gray-800 border border-gray-600 rounded-xl p-3 space-y-2.5">
                <p className="text-xs text-gray-400 font-semibold mb-1">Please confirm before continuing:</p>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={declarations.noExternalKeyboard}
                    onChange={e => setDeclarations(p => ({ ...p, noExternalKeyboard: e.target.checked }))}
                    className="mt-0.5 accent-blue-500 w-4 h-4 shrink-0"
                  />
                  <span className="text-xs text-gray-300 group-hover:text-white transition-colors leading-relaxed">
                    I have <strong className="text-white">disconnected all external keyboards, mice, and recording devices</strong> from this computer.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={declarations.noBackgroundApps}
                    onChange={e => setDeclarations(p => ({ ...p, noBackgroundApps: e.target.checked }))}
                    className="mt-0.5 accent-blue-500 w-4 h-4 shrink-0"
                  />
                  <span className="text-xs text-gray-300 group-hover:text-white transition-colors leading-relaxed">
                    I have <strong className="text-white">closed all other applications</strong> running in the background.
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Rules */}
        <div className={`mb-6 transition-opacity ${systemCheckPassed && cameraStatus === 'granted' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <StepHeader step={3} done={false} label="Proctoring Rules" />
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4">
            <ul className="text-yellow-200/80 text-xs space-y-1.5">
              <li>• The exam opens in <strong className="text-yellow-300">fullscreen</strong> — do not exit</li>
              <li>• Do not switch browser tabs or minimize the window</li>
              <li>• Do not switch to any other application</li>
              <li>• Right-click, copy, cut, and paste are <strong className="text-yellow-300">blocked</strong></li>
              <li>• Keyboard shortcuts (F12, Ctrl+U, Ctrl+S, Ctrl+P, DevTools) are blocked</li>
              <li>• Camera snapshots are taken every 2 minutes</li>
              <li>• Developer tools and extra monitors are detected and flagged</li>
              <li>• Mouse activity is monitored for inactivity and unusual patterns</li>
              <li>• Exam <strong className="text-yellow-300">auto-submits</strong> after {examConfig.maxViolations} violations</li>
            </ul>
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={!canStart}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            canStart
              ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {cameraStatus !== 'granted' ? 'Complete Step 1 First'
            : !systemCheckPassed      ? 'Complete Step 2 First'
            : 'Start Exam — Enter Fullscreen'}
        </button>
      </div>
    </div>
  );
}

function StepHeader({ step, done, label }: { step: number; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        done ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
      }`}>
        {done ? '✓' : step}
      </div>
      <p className="text-sm font-semibold text-white">{label}</p>
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ExamPageContent />
    </Suspense>
  );
}
