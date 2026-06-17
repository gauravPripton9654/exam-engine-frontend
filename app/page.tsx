'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCurricula } from '@/lib/api';
import { CurriculumSummary } from '@/types';

type Step = 'select' | 'login';

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('select');
  const [curricula, setCurricula] = useState<CurriculumSummary[]>([]);
  const [loadingCurricula, setLoadingCurricula] = useState(true);
  const [curriculaError, setCurriculaError] = useState<string | null>(null);
  const [selectedCurriculum, setSelectedCurriculum] = useState<CurriculumSummary | null>(null);
  const [form, setForm] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const small = window.innerWidth < 1024;
    setIsMobile(mobileUA || small);
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    fetchCurricula()
      .then(data => setCurricula(data))
      .catch(() => setCurriculaError('Failed to load curricula. Is the server running?'))
      .finally(() => setLoadingCurricula(false));
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStart = () => {
    if (!validate() || !selectedCurriculum) return;
    const params = new URLSearchParams({
      name: form.name,
      email: form.email,
      curriculumId: String(selectedCurriculum.id),
    });
    router.push(`/exam?${params.toString()}`);
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-7xl mb-6">💻</div>
        <h1 className="text-2xl font-bold text-white mb-3">Desktop Required</h1>
        <p className="text-gray-400 text-sm max-w-xs">
          This exam must be taken on a <span className="text-white font-medium">laptop or desktop computer</span>.
          Mobile phones and tablets are not allowed.
        </p>
        <div className="mt-8 bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 max-w-xs">
          <p className="text-yellow-300 text-xs">
            Please switch to a desktop or laptop device and visit this page again to proceed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-2xl">🎓</div>
          <h1 className="text-3xl font-bold text-white">ProctorAI</h1>
        </div>
        <p className="text-gray-400">AI-Powered Online Examination Platform</p>
      </div>

      {step === 'select' ? (
        // ── Curriculum selection ──────────────────────────────────────────────
        <div className="w-full max-w-4xl">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white">Select Your Test</h2>
            <p className="text-gray-400 text-sm mt-1">Choose the curriculum you want to be assessed on</p>
          </div>

          {loadingCurricula && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Loading available tests…</p>
            </div>
          )}

          {curriculaError && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="text-5xl">⚠️</div>
              <p className="text-red-400 text-sm font-medium">{curriculaError}</p>
              <button
                onClick={() => {
                  setCurriculaError(null);
                  setLoadingCurricula(true);
                  fetchCurricula()
                    .then(data => setCurricula(data))
                    .catch(() => setCurriculaError('Failed to load curricula. Is the server running?'))
                    .finally(() => setLoadingCurricula(false));
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loadingCurricula && !curriculaError && curricula.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="text-5xl">📭</div>
              <p className="text-gray-400 text-sm">No tests available at the moment.</p>
              <p className="text-gray-600 text-xs">Please contact your administrator.</p>
            </div>
          )}

          {!loadingCurricula && !curriculaError && curricula.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {curricula.map(c => {
                  const isSelected = selectedCurriculum?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCurriculum(c)}
                      className={`text-left rounded-2xl border p-5 transition-all focus:outline-none ${
                        isSelected
                          ? 'bg-blue-900/40 border-blue-500 shadow-lg shadow-blue-900/30'
                          : 'bg-gray-900 border-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                          isSelected ? 'bg-blue-600' : 'bg-gray-800'
                        }`}>
                          📚
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <h3 className={`font-bold text-sm mb-1 ${isSelected ? 'text-blue-200' : 'text-white'}`}>
                        {c.title}
                      </h3>
                      <p className={`text-xs mb-3 ${isSelected ? 'text-blue-300/70' : 'text-gray-400'}`}>
                        {c.role} · {c.company}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          isSelected
                            ? 'bg-blue-900/50 border-blue-600 text-blue-300'
                            : 'bg-gray-800 border-gray-600 text-gray-400'
                        }`}>
                          {c.sector}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          isSelected
                            ? 'bg-blue-900/50 border-blue-600 text-blue-300'
                            : 'bg-gray-800 border-gray-600 text-gray-400'
                        }`}>
                          {c.n} questions
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => selectedCurriculum && setStep('login')}
                  disabled={!selectedCurriculum}
                  className={`px-10 py-3 rounded-xl font-bold text-sm transition-all ${
                    selectedCurriculum
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {selectedCurriculum
                    ? `Continue with "${selectedCurriculum.title}" →`
                    : 'Select a test to continue'}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        // ── Login form ────────────────────────────────────────────────────────
        <div className="w-full max-w-2xl">
          {/* Back button + selected curriculum */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setStep('select')}
              className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-1"
            >
              ← Back
            </button>
            <div className="h-4 w-px bg-gray-700" />
            <p className="text-sm text-gray-400">
              Test: <span className="text-white font-medium">{selectedCurriculum?.title}</span>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Exam info */}
            <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6">
              <h2 className="text-lg font-bold text-white mb-4">Exam Details</h2>
              <div className="space-y-3">
                {[
                  { icon: '📝', label: 'Test',    value: selectedCurriculum!.title },
                  { icon: '🏢', label: 'Company', value: selectedCurriculum!.company },
                  { icon: '👤', label: 'Role',    value: selectedCurriculum!.role },
                  { icon: '❓', label: 'Questions', value: `${selectedCurriculum!.n}` },
                  { icon: '🛡', label: 'Max Violations', value: '5' },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 py-2 border-b border-gray-800">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-sm text-white font-medium">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 bg-blue-900/20 border border-blue-800 rounded-xl p-3">
                <p className="text-xs text-blue-400 font-semibold mb-2">Active Monitoring</p>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    '🔄 Tab Monitoring',
                    '📸 Auto Snapshots',
                    '🖱 Right-click Block',
                    '⛶ Fullscreen Lock',
                    '📋 Copy Protection',
                    '🔍 DevTools Block',
                    '⌨ Keyboard Guard',
                    '🖥 Mouse Monitor',
                    '🖵 Multi-Monitor Block',
                  ].map(f => (
                    <p key={f} className="text-xs text-blue-300">{f}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* Login form */}
            <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6">
              <h2 className="text-lg font-bold text-white mb-4">Candidate Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Enter your full name"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white
                               placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Email (optional)</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="your@email.com"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white
                               placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>

                <button
                  onClick={handleStart}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all mt-2"
                >
                  Proceed to Exam →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="text-gray-600 text-xs mt-8 text-center">
        By proceeding, you agree that your activity and periodic camera snapshots will be monitored during the exam.
      </p>
    </div>
  );
}
