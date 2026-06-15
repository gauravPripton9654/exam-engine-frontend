'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { examConfig } from '@/lib/questions';
import { CandidateInfo } from '@/types';

const ExamInterface = dynamic(() => import('@/components/ExamInterface'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading exam...</p>
      </div>
    </div>
  ),
});

type CameraStatus = 'idle' | 'checking' | 'granted' | 'denied';

function ExamPageContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [candidate, setCandidate]     = useState<CandidateInfo | null>(null);
  const [started, setStarted]         = useState(false);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [isMobile, setIsMobile]       = useState(false);

  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  // Mobile detection — also block here in case someone bypasses home page
  useEffect(() => {
    const ua = navigator.userAgent;
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    setIsMobile(mobileUA || window.innerWidth < 1024);
  }, []);

  useEffect(() => {
    const name  = searchParams.get('name');
    const id    = searchParams.get('id');
    const email = searchParams.get('email');
    if (!name || !id) { router.push('/'); return; }
    setCandidate({ name, id, email: email ?? '' });
  }, [searchParams, router]);

  // Cleanup preview stream when component unmounts or exam starts
  useEffect(() => {
    return () => {
      previewStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const requestCamera = async () => {
    setCameraStatus('checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      previewStreamRef.current = stream;
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }
      setCameraStatus('granted');
    } catch {
      setCameraStatus('denied');
    }
  };

  const handleStart = () => {
    // Release preview stream — useProctor will open its own stream
    previewStreamRef.current?.getTracks().forEach(t => t.stop());
    previewStreamRef.current = null;

    // Enter fullscreen then start exam — .finally() so we start even if fullscreen is denied
    document.documentElement
      .requestFullscreen?.()
      .catch(() => {})
      .finally(() => setStarted(true));
  };

  // ── Mobile block ─────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-7xl mb-6">💻</div>
        <h1 className="text-2xl font-bold text-white mb-3">Desktop Required</h1>
        <p className="text-gray-400 text-sm max-w-xs">
          This exam must be taken on a{' '}
          <span className="text-white font-medium">laptop or desktop computer</span>.
          Mobile phones and tablets are not allowed.
        </p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (started) {
    return <ExamInterface candidate={candidate} exam={examConfig} />;
  }

  // ── Pre-exam start screen ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-gray-900 rounded-2xl border border-gray-700 p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-white">{examConfig.name}</h2>
          <p className="text-gray-400 mt-1">Welcome, {candidate.name}</p>
        </div>

        {/* Exam details */}
        <div className="space-y-2 mb-6">
          {[
            ['Questions',      `${examConfig.questions.length} Multiple Choice`],
            ['Duration',       `${examConfig.duration / 60} minutes`],
            ['Max Violations', `${examConfig.maxViolations} — exam auto-submits after this`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400 text-sm">{label}</span>
              <span className="text-white text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>

        {/* ── Step 1: Camera access ────────────────────────────────────────────── */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              cameraStatus === 'granted' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}>
              {cameraStatus === 'granted' ? '✓' : '1'}
            </div>
            <p className="text-sm font-semibold text-white">Camera Access</p>
          </div>

          {cameraStatus === 'idle' && (
            <div className="bg-gray-800 border border-gray-600 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-3">
                Camera access is <span className="text-white font-medium">required</span> to start.
                A snapshot is taken every 5 minutes for proctoring.
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
              {/* Live preview */}
              <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={previewVideoRef}
                  muted
                  playsInline
                  autoPlay
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
                Allow camera access in your browser settings (address bar → camera icon) and try again.
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

        {/* ── Step 2: Rules ────────────────────────────────────────────────────── */}
        <div className={`mb-6 transition-opacity ${cameraStatus === 'granted' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              cameraStatus === 'granted' ? 'bg-gray-600 text-white' : 'bg-gray-700 text-gray-500'
            }`}>2</div>
            <p className="text-sm font-semibold text-white">Proctoring Rules</p>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4">
            <ul className="text-yellow-200/80 text-xs space-y-1.5">
              <li>• The exam opens in <strong className="text-yellow-300">fullscreen</strong> — do not exit</li>
              <li>• Do not switch browser tabs or minimize the window</li>
              <li>• Do not switch to any other application</li>
              <li>• Right-click is disabled throughout the exam</li>
              <li>• Camera snapshots are taken every 5 minutes</li>
              <li>• Exam <strong className="text-yellow-300">auto-submits</strong> after {examConfig.maxViolations} violations</li>
            </ul>
          </div>
        </div>

        {/* ── Start button ─────────────────────────────────────────────────────── */}
        <button
          onClick={handleStart}
          disabled={cameraStatus !== 'granted'}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            cameraStatus === 'granted'
              ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {cameraStatus === 'granted' ? 'Start Exam — Enter Fullscreen' : 'Complete Step 1 First'}
        </button>
      </div>
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
