'use client';

import { Suspense, useEffect, useState } from 'react';
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

function ExamPageContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const [candidate, setCandidate] = useState<CandidateInfo | null>(null);
  const [started, setStarted]     = useState(false);

  useEffect(() => {
    const name  = searchParams.get('name');
    const id    = searchParams.get('id');
    const email = searchParams.get('email');
    if (!name || !id) { router.push('/'); return; }
    setCandidate({ name, id, email: email ?? '' });
  }, [searchParams, router]);

  const handleStart = () => {
    // Enter fullscreen before starting the exam; proceed regardless if denied
    document.documentElement.requestFullscreen?.().catch(() => {}).finally(() => {
      setStarted(true);
    });
  };

  if (!candidate) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-gray-900 rounded-2xl border border-gray-700 p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-white">{examConfig.name}</h2>
            <p className="text-gray-400 mt-2">Welcome, {candidate.name}</p>
          </div>

          <div className="space-y-3 mb-8">
            {[
              ['Questions',      `${examConfig.questions.length} Multiple Choice`],
              ['Duration',       `${examConfig.duration / 60} minutes`],
              ['Max Violations', `${examConfig.maxViolations} (exam terminates after)`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400 text-sm">{label}</span>
                <span className="text-white text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>

          <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 mb-6">
            <p className="text-yellow-300 text-sm font-semibold mb-2">Proctoring Rules</p>
            <ul className="text-yellow-200/80 text-xs space-y-1">
              <li>• The exam will run in fullscreen — do not exit</li>
              <li>• Do not switch tabs or minimize the browser</li>
              <li>• Do not switch to another application window</li>
              <li>• Right-click is disabled during the exam</li>
              <li>• A camera snapshot is taken every 5 minutes</li>
              <li>• Exam terminates after {examConfig.maxViolations} violations</li>
            </ul>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg transition-all"
          >
            Start Exam (Enters Fullscreen)
          </button>
        </div>
      </div>
    );
  }

  return <ExamInterface candidate={candidate} exam={examConfig} />;
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
