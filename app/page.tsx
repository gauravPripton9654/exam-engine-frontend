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
      e.email = 'Invalid email address';
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
          <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Desktop Required</h1>
        <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
          This exam must be taken on a laptop or desktop computer. Mobile phones and tablets are not supported.
        </p>
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-xs">
          <p className="text-amber-700 text-xs leading-relaxed">
            Please switch to a desktop or laptop and visit this page again to proceed.
          </p>
        </div>
      </div>
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
          <span className="text-xs text-slate-400">Secure Online Assessment</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {step === 'select' ? (
          <div>
            <div className="mb-10">
              <h1 className="text-3xl font-semibold text-slate-900 mb-2">Select your assessment</h1>
              <p className="text-slate-500">Choose the curriculum you want to be evaluated on.</p>
            </div>

            {loadingCurricula && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 text-sm">Loading available assessments…</p>
              </div>
            )}

            {curriculaError && (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <p className="text-slate-700 font-medium text-sm">{curriculaError}</p>
                <button
                  onClick={() => {
                    setCurriculaError(null);
                    setLoadingCurricula(true);
                    fetchCurricula()
                      .then(data => setCurricula(data))
                      .catch(() => setCurriculaError('Failed to load curricula. Is the server running?'))
                      .finally(() => setLoadingCurricula(false));
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Try again
                </button>
              </div>
            )}

            {!loadingCurricula && !curriculaError && curricula.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </div>
                <p className="text-slate-600 font-medium text-sm">No assessments available</p>
                <p className="text-slate-400 text-xs">Please contact your administrator.</p>
              </div>
            )}

            {!loadingCurricula && !curriculaError && curricula.length > 0 && (
              <>
                <div className="space-y-3 mb-8">
                  {curricula.map((c, idx) => {
                    const isSelected = selectedCurriculum?.id === c.id;
                    const palette = [
                      { bg: 'bg-violet-500',  light: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200',  ring: 'ring-violet-300'  },
                      { bg: 'bg-indigo-500',  light: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200',  ring: 'ring-indigo-300'  },
                      { bg: 'bg-sky-500',     light: 'bg-sky-50',     text: 'text-sky-600',     border: 'border-sky-200',     ring: 'ring-sky-300'     },
                      { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', ring: 'ring-emerald-300' },
                      { bg: 'bg-rose-500',    light: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    ring: 'ring-rose-300'    },
                      { bg: 'bg-amber-500',   light: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   ring: 'ring-amber-300'   },
                    ];
                    const color = palette[idx % palette.length];
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCurriculum(c)}
                        className={`group w-full text-left rounded-2xl border transition-all duration-200 focus:outline-none bg-white ${
                          isSelected
                            ? `${color.border} ring-1 ${color.ring} shadow-md`
                            : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-5 px-5 py-5">

                          {/* Color avatar */}
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                            isSelected ? color.bg : 'bg-slate-100 group-hover:' + color.bg.replace('bg-', 'bg-')
                          } transition-all duration-200`}
                            style={isSelected ? {} : {}}
                          >
                            <span className={`text-base font-bold ${isSelected ? 'text-white' : 'text-slate-500 group-hover:text-white'} transition-colors duration-200`}>
                              {c.title.charAt(0).toUpperCase()}
                            </span>
                          </div>

                          {/* Main content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <h3 className="text-[15px] font-semibold text-slate-900 leading-snug truncate">
                                  {c.title}
                                </h3>
                                <p className="text-sm text-slate-500 mt-0.5 truncate">
                                  {c.role}
                                  <span className="mx-1.5 text-slate-300">·</span>
                                  <span className="text-slate-400">{c.company}</span>
                                </p>
                              </div>

                              {/* Select indicator */}
                              <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 mt-0.5 ${
                                isSelected
                                  ? `${color.bg} border-transparent`
                                  : 'border-slate-300 group-hover:border-slate-400'
                              }`}>
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                )}
                              </div>
                            </div>

                            {/* Tags row */}
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                                isSelected ? `${color.light} ${color.text}` : 'bg-slate-100 text-slate-500'
                              } transition-all duration-200`}>
                                {c.sector}
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                                </svg>
                                {c.n} questions
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                60 min
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Continue button */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">
                    {selectedCurriculum
                      ? <span>Selected: <span className="font-medium text-slate-700">{selectedCurriculum.title}</span></span>
                      : 'Pick an assessment above to continue'}
                  </p>
                  <button
                    onClick={() => selectedCurriculum && setStep('login')}
                    disabled={!selectedCurriculum}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                      selectedCurriculum
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Continue
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-10">
              <button
                onClick={() => setStep('select')}
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>
              <div className="h-4 w-px bg-slate-200" />
              <p className="text-sm text-slate-500">
                Assessment: <span className="text-slate-800 font-medium">{selectedCurriculum?.title}</span>
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
              {/* Exam details card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-base font-semibold text-slate-900 mb-5">Assessment Details</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Test', value: selectedCurriculum!.title },
                    { label: 'Company', value: selectedCurriculum!.company },
                    { label: 'Role', value: selectedCurriculum!.role },
                    { label: 'Questions', value: `${selectedCurriculum!.n} questions` },
                    { label: 'Duration', value: '60 minutes' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                      <span className="text-xs text-slate-400 font-medium">{label}</span>
                      <span className="text-xs text-slate-700 font-medium">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-600 mb-3">Active Monitoring</p>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                    {[
                      'Tab switching detection',
                      'Periodic camera snapshots',
                      'Fullscreen enforcement',
                      'Copy / paste blocked',
                      'DevTools blocked',
                      'Multi-monitor detection',
                      'Mouse leave tracking',
                      'Focus loss detection',
                    ].map(f => (
                      <div key={f} className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <p className="text-[11px] text-slate-500">{f}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Login form */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-base font-semibold text-slate-900 mb-5">Your Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1.5">Full Name <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Enter your full name"
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400
                                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                        errors.name ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white'
                      }`}
                    />
                    {errors.name && <p className="text-rose-500 text-xs mt-1.5">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1.5">
                      Email <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="you@example.com"
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400
                                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                        errors.email ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white'
                      }`}
                    />
                    {errors.email && <p className="text-rose-500 text-xs mt-1.5">{errors.email}</p>}
                  </div>

                  <button
                    onClick={handleStart}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
                  >
                    Proceed to Exam
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <p className="text-slate-400 text-xs text-center">
            By proceeding, you agree that your activity and periodic camera snapshots will be monitored during the exam.
          </p>
        </div>
      </footer>
    </div>
  );
}
