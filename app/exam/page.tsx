'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { fetchCurriculum, fetchQuestions } from '@/lib/api';
import { toRuntimeQuestion } from '@/lib/questions';
import { CandidateInfo, ExamConfig, ExamMode } from '@/types';

const ExamInterface = dynamic(() => import('@/components/ExamInterface'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Loading exam…</p>
      </div>
    </div>
  ),
});

type CameraStatus  = 'idle' | 'checking' | 'granted' | 'denied';
type ScreenStatus  = 'idle' | 'checking' | 'granted' | 'denied' | 'wrong_surface';
type MonitorStatus = 'unchecked' | 'ok' | 'extra_detected';

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

const MODE_INFO: Record<ExamMode, { title: string; description: string }> = {
  easy:   { title: 'Easy',   description: 'No restrictions — just the exam timer.' },
  medium: { title: 'Medium', description: 'Anti-cheat monitoring, no camera required.' },
  hard:   { title: 'Hard',   description: 'Full monitoring plus camera snapshots.' },
};

function StepHeader({ step, done, label }: { step: number | string; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all ${
        done ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-700'
      }`}>
        {done ? <CheckIcon className="w-3.5 h-3.5" /> : step}
      </div>
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      {done && <span className="text-xs text-emerald-600 font-medium">Complete</span>}
    </div>
  );
}

function ExamPageContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [candidate, setCandidate]         = useState<CandidateInfo | null>(null);
  const [examConfig, setExamConfig]       = useState<Omit<ExamConfig, 'mode'> | null>(null);
  const [loadingExam, setLoadingExam]     = useState(true);
  const [examError, setExamError]         = useState<string | null>(null);
  const [started, setStarted]             = useState(false);
  const [mode, setMode]                   = useState<ExamMode | null>(null);

  const [cameraStatus, setCameraStatus]   = useState<CameraStatus>('idle');
  const [screenStatus, setScreenStatus]   = useState<ScreenStatus>('idle');
  const [isMobile, setIsMobile]           = useState(false);
  const [monitorStatus, setMonitorStatus] = useState<MonitorStatus>('unchecked');
  const [declarations, setDeclarations]   = useState({
    noExternalKeyboard: false,
    noBackgroundApps:   false,
  });

  const previewVideoRef  = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef  = useRef<MediaStream | null>(null);
  const audioStreamRef   = useRef<MediaStream | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    setIsMobile(mobileUA || window.innerWidth < 1024);
  }, []);

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
          questions,
        });
      })
      .catch(() => setExamError('Failed to load exam questions. Please go back and try again.'))
      .finally(() => setLoadingExam(false));
  }, [searchParams, router]);

  useEffect(() => {
    return () => {
      previewStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      audioStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const requestCamera = async () => {
    setCameraStatus('checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        // Requested together with the camera, right here, for hard mode —
        // one combined permission prompt at this step.
        audio: mode === 'hard',
      });
      previewStreamRef.current = stream;
      if (previewVideoRef.current) previewVideoRef.current.srcObject = stream;

      // Keep the audio track alive as its own stream so handleStart() can
      // stop only the video preview later without cutting off the mic —
      // this same track keeps recording all the way through the exam.
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioStreamRef.current = new MediaStream(audioTracks);
      }

      setCameraStatus('granted');
    } catch {
      setCameraStatus('denied');
    }
  };

  const requestScreenAccess = async () => {
    setScreenStatus('checking');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' } as MediaTrackConstraints,
        audio: false,
      });
      const track    = stream.getVideoTracks()[0];
      const surface  = (track.getSettings() as MediaTrackSettings & { displaySurface?: string }).displaySurface;
      if (surface && surface !== 'monitor') {
        stream.getTracks().forEach(t => t.stop());
        setScreenStatus('wrong_surface');
        return;
      }
      screenStreamRef.current = stream;
      track.addEventListener('ended', () => {
        screenStreamRef.current = null;
        setScreenStatus('denied');
      });
      setScreenStatus('granted');
    } catch {
      setScreenStatus('denied');
    }
  };

  const runMonitorCheck = useCallback(() => {
    const extended = ('isExtended' in window.screen)
      ? (window.screen as typeof window.screen & { isExtended: boolean }).isExtended === true
      : false;
    setMonitorStatus(extended ? 'extra_detected' : 'ok');
  }, []);

  useEffect(() => {
    if (screenStatus === 'granted') runMonitorCheck();
  }, [screenStatus, runMonitorCheck]);

  const cameraRequired = mode === 'hard';
  const screenRequired = mode === 'medium' || mode === 'hard';

  const systemCheckPassed =
    !screenRequired ||
    (monitorStatus === 'ok' &&
      declarations.noExternalKeyboard &&
      declarations.noBackgroundApps);

  const canStart =
    mode !== null &&
    (!cameraRequired || cameraStatus === 'granted') &&
    (!screenRequired || screenStatus === 'granted') &&
    systemCheckPassed;

  const handleStart = () => {
    // Only stop the video track — the audio track is shared with
    // audioStreamRef (see requestCamera) and needs to keep running for the
    // exam's mic recording.
    previewStreamRef.current?.getVideoTracks().forEach(t => t.stop());
    previewStreamRef.current = null;

    if (mode === 'easy') {
      setStarted(true);
      return;
    }
    document.documentElement
      .requestFullscreen?.()
      .catch(() => {})
      .finally(() => setStarted(true));
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
          <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Desktop Required</h1>
        <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
          This exam must be taken on a laptop or desktop computer. Mobile devices are not supported.
        </p>
      </div>
    );
  }

  if (loadingExam) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading exam questions…</p>
      </div>
    );
  }

  if (examError || !examConfig || !candidate) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center">
          <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-slate-700 font-medium text-sm">{examError ?? 'Something went wrong.'}</p>
        <button
          onClick={() => router.push('/')}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (started && mode) {
    return (
      <ExamInterface
        candidate={candidate}
        exam={{ ...examConfig, mode }}
        screenStream={screenStreamRef.current}
        audioStream={audioStreamRef.current}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900 text-sm tracking-tight">Pripton</span>
          </div>
          <span className="text-xs text-slate-400">Pre-exam Setup</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-10">
        {/* Exam title */}
        <div className="mb-8">
          <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-1">Assessment</p>
          <h1 className="text-xl font-semibold text-slate-900">{examConfig.name}</h1>
          <p className="text-slate-500 text-sm mt-1">Welcome, {candidate.name}</p>
        </div>

        {/* Exam meta */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            {[
              { label: 'Questions', value: String(examConfig.questions.length) },
              { label: 'Duration', value: `${examConfig.duration / 60} min` },
              { label: 'Mode', value: mode === null ? '—' : mode === 'easy' ? 'Timer Only' : mode === 'medium' ? 'Medium' : 'Hard' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center px-4 first:pl-0 last:pr-0">
                <p className="text-lg font-semibold text-slate-900">{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Difficulty */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <StepHeader step={1} done={mode !== null} label="Choose Exam Mode" />
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(MODE_INFO) as ExamMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`text-left rounded-xl border-2 p-3.5 transition-all ${
                  mode === m
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className={`text-sm font-semibold ${mode === m ? 'text-indigo-700' : 'text-slate-800'}`}>
                  {MODE_INFO[m].title}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{MODE_INFO[m].description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Camera */}
        {cameraRequired && (
        <div className={`bg-white rounded-2xl border border-slate-200 p-5 mb-4 transition-opacity ${mode !== null ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <StepHeader step={2} done={cameraStatus === 'granted'} label="Camera Access" />

          {cameraStatus === 'idle' && (
            <div>
              <p className="text-slate-500 text-xs mb-3 leading-relaxed">
                Camera and microphone access are required. A snapshot is taken every 2 minutes to verify your identity, and your microphone is recorded throughout the exam for transcription.
              </p>
              <button onClick={requestCamera}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors">
                Enable Camera
              </button>
            </div>
          )}

          {cameraStatus === 'checking' && (
            <div className="flex items-center gap-3 py-1">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-slate-500 text-sm">Requesting camera access…</p>
            </div>
          )}

          {cameraStatus === 'granted' && (
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <div className="relative bg-slate-900" style={{ aspectRatio: '16/9' }}>
                <video ref={previewVideoRef} muted playsInline autoPlay
                  className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                  <span className="text-white text-[10px] font-medium">Live Preview</span>
                </div>
              </div>
              <div className="px-3 py-2 flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckIcon className="w-2.5 h-2.5 text-emerald-600" />
                </div>
                <p className="text-emerald-700 text-xs font-medium">Camera access granted</p>
              </div>
              {mode === 'hard' && (
                <div className="px-3 py-2 border-t border-slate-100 flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    (audioStreamRef.current?.getAudioTracks().length ?? 0) > 0 ? 'bg-emerald-100' : 'bg-rose-100'
                  }`}>
                    {(audioStreamRef.current?.getAudioTracks().length ?? 0) > 0
                      ? <CheckIcon className="w-2.5 h-2.5 text-emerald-600" />
                      : <span className="text-rose-600 text-[10px] font-bold">!</span>}
                  </div>
                  <p className={`text-xs font-medium ${
                    (audioStreamRef.current?.getAudioTracks().length ?? 0) > 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    {(audioStreamRef.current?.getAudioTracks().length ?? 0) > 0
                      ? `Microphone captured (${audioStreamRef.current!.getAudioTracks().length} track)`
                      : 'No microphone track captured — retry Camera Access'}
                  </p>
                </div>
              )}
            </div>
          )}

          {cameraStatus === 'denied' && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
              <p className="text-rose-700 text-sm font-medium mb-1">Camera access denied</p>
              <p className="text-rose-500 text-xs mb-3">Allow camera access in your browser settings and try again.</p>
              <button onClick={requestCamera}
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors">
                Retry
              </button>
            </div>
          )}
        </div>
        )}

        {/* Step 3: Screen monitoring */}
        {screenRequired && (
        <div className={`bg-white rounded-2xl border border-slate-200 p-5 mb-4 transition-opacity ${(!cameraRequired || cameraStatus === 'granted') ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <StepHeader step={3} done={screenStatus === 'granted'} label="Screen Monitoring" />

          {screenStatus === 'idle' && (
            <div>
              <p className="text-slate-500 text-xs mb-1 leading-relaxed">
                You must share your <span className="text-slate-700 font-medium">entire screen</span> with the exam system. This stream is monitored throughout.
              </p>
              <p className="text-slate-400 text-xs mb-3">Stopping screen share is flagged as a high-severity violation.</p>
              <button onClick={requestScreenAccess}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors">
                Share Entire Screen
              </button>
            </div>
          )}

          {screenStatus === 'checking' && (
            <div className="flex items-center gap-3 py-1">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-slate-500 text-sm">Waiting for screen selection…</p>
            </div>
          )}

          {screenStatus === 'wrong_surface' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-amber-800 text-sm font-medium mb-1">Incorrect selection</p>
              <p className="text-amber-600 text-xs mb-3">
                You selected a tab or window. Choose <strong>Entire Screen</strong> or <strong>Your Entire Screen</strong> in the picker.
              </p>
              <button onClick={requestScreenAccess}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors">
                Try Again
              </button>
            </div>
          )}

          {screenStatus === 'granted' && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                <CheckIcon className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-emerald-700 text-xs font-semibold">Screen monitoring active</p>
                <p className="text-slate-400 text-[10px] mt-0.5">Do not stop sharing — it will be flagged as a violation.</p>
              </div>
            </div>
          )}

          {screenStatus === 'denied' && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
              <p className="text-rose-700 text-sm font-medium mb-1">Screen access denied or stopped</p>
              <p className="text-rose-500 text-xs mb-3">Screen monitoring is required. Click below and select your entire screen.</p>
              <button onClick={requestScreenAccess}
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors">
                Retry
              </button>
            </div>
          )}
        </div>
        )}

        {/* Step 4: System check */}
        {screenRequired && (
        <div className={`bg-white rounded-2xl border border-slate-200 p-5 mb-4 transition-opacity ${screenStatus === 'granted' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <StepHeader step={4} done={systemCheckPassed} label="System Check" />

          <div className="space-y-3">
            <div className={`rounded-xl border p-3.5 ${
              monitorStatus === 'extra_detected' ? 'bg-rose-50 border-rose-200'
              : monitorStatus === 'ok'           ? 'bg-emerald-50 border-emerald-200'
                                                 : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    monitorStatus === 'ok' ? 'bg-emerald-100' : monitorStatus === 'extra_detected' ? 'bg-rose-100' : 'bg-slate-100'
                  }`}>
                    <svg className={`w-4 h-4 ${monitorStatus === 'ok' ? 'text-emerald-600' : monitorStatus === 'extra_detected' ? 'text-rose-500' : 'text-slate-400'}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Display Check</p>
                    {monitorStatus === 'unchecked'      && <p className="text-xs text-slate-400">Checking displays…</p>}
                    {monitorStatus === 'ok'             && <p className="text-xs text-emerald-600">Single display detected</p>}
                    {monitorStatus === 'extra_detected' && <p className="text-xs text-rose-500">Extra monitor detected — please disconnect it</p>}
                  </div>
                </div>
                {monitorStatus !== 'unchecked' && (
                  <button onClick={runMonitorCheck} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium ml-2">
                    Re-check
                  </button>
                )}
              </div>
              {monitorStatus === 'extra_detected' && (
                <p className="text-rose-500 text-xs mt-2 pl-10">Disconnect the extra monitor, then click Re-check.</p>
              )}
            </div>

            {monitorStatus === 'ok' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-xs text-slate-500 font-semibold">Please confirm before continuing:</p>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                    declarations.noExternalKeyboard ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
                  }`}>
                    {declarations.noExternalKeyboard && <CheckIcon className="w-2.5 h-2.5 text-white" />}
                    <input type="checkbox" checked={declarations.noExternalKeyboard}
                      onChange={e => setDeclarations(p => ({ ...p, noExternalKeyboard: e.target.checked }))}
                      className="sr-only" />
                  </div>
                  <span className="text-xs text-slate-600 leading-relaxed">
                    I have <strong className="text-slate-800">disconnected all external keyboards, mice, and recording devices</strong>.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                    declarations.noBackgroundApps ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
                  }`}>
                    {declarations.noBackgroundApps && <CheckIcon className="w-2.5 h-2.5 text-white" />}
                    <input type="checkbox" checked={declarations.noBackgroundApps}
                      onChange={e => setDeclarations(p => ({ ...p, noBackgroundApps: e.target.checked }))}
                      className="sr-only" />
                  </div>
                  <span className="text-xs text-slate-600 leading-relaxed">
                    I have <strong className="text-slate-800">closed all other applications</strong> running in the background.
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Step 5: Rules */}
        <div className={`bg-white rounded-2xl border border-slate-200 p-5 mb-6 transition-opacity ${mode !== null ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <StepHeader step={5} done={false} label="Exam Rules" />
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <ul className="space-y-2">
              {[
                ...(mode !== 'easy' ? [
                  'The exam opens in fullscreen — do not exit',
                  'Do not switch browser tabs or minimize the window',
                  'Right-click, copy, cut, and paste are blocked',
                  'Keyboard shortcuts (F12, DevTools) are blocked',
                ] : []),
                ...(screenRequired ? ['Stop screen sharing is flagged as a violation'] : []),
                ...(cameraRequired ? [
                  'Camera snapshots are taken every 2 minutes',
                  'Microphone audio is recorded throughout and transcribed',
                ] : []),
                ...(mode !== 'easy' ? ['Violations are recorded but do not end the exam'] : []),
                'Exam auto-submits when time runs out',
              ].map(rule => (
                <li key={rule} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span className="text-xs text-amber-800">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={!canStart}
          className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            canStart
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {mode === null                                       ? 'Choose an exam mode to continue'
            : cameraRequired && cameraStatus !== 'granted'      ? 'Complete Camera Access to continue'
            : screenRequired && screenStatus !== 'granted'      ? 'Complete Screen Monitoring to continue'
            : !systemCheckPassed                                ? 'Complete System Check to continue'
            : (
              <>
                {mode === 'easy' ? 'Begin Exam' : 'Begin Exam — Enter Fullscreen'}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </>
            )
          }
        </button>
      </main>
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ExamPageContent />
    </Suspense>
  );
}
