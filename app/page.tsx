'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, Briefcase, FileText, ClipboardList, Layers, Award,
  Lock, HelpCircle, Clock, ArrowRight, ArrowLeft, Camera,
  Loader2, AlertTriangle, Inbox, Laptop,
  User, Building2, AppWindow, Maximize, ClipboardX, Code2, MonitorCheck, MousePointer2, Focus,
} from 'lucide-react';
import { fetchCurricula } from '@/lib/api';
import { CurriculumSummary } from '@/types';

type Step = 'select' | 'login';

const PALETTE = [
  { bg: 'bg-violet-500',  light: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200',  ring: 'ring-violet-300'  },
  { bg: 'bg-indigo-500',  light: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200',  ring: 'ring-indigo-300'  },
  { bg: 'bg-sky-500',     light: 'bg-sky-50',     text: 'text-sky-600',     border: 'border-sky-200',     ring: 'ring-sky-300'     },
  { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', ring: 'ring-emerald-300' },
  { bg: 'bg-rose-500',    light: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    ring: 'ring-rose-300'    },
  { bg: 'bg-amber-500',   light: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   ring: 'ring-amber-300'   },
];

const CARD_ICONS = [ShieldCheck, Briefcase, FileText, ClipboardList, Layers, Award];

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

  const loadCurricula = () => {
    setLoadingCurricula(true);
    setCurriculaError(null);
    fetchCurricula()
      .then(data => setCurricula(data))
      .catch(() => setCurriculaError('Failed to load curricula. Is the server running?'))
      .finally(() => setLoadingCurricula(false));
  };

  useEffect(() => { loadCurricula(); }, []);

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
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
          <Laptop className="w-7 h-7 text-blue-600" strokeWidth={1.5} />
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
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Topbar */}
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl flex items-center justify-center shadow-sm shadow-blue-500/30">
              <ShieldCheck className="w-4 h-4 text-white" strokeWidth={2.25} />
            </div>
            <span className="font-bold text-slate-900 text-[15px] tracking-tight">Pripton</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Lock className="w-3.5 h-3.5" strokeWidth={2} />
            <span className="text-xs font-medium">Secure Online Assessment Mode</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 flex-1 w-full">
        {step === 'select' ? (
          <div>
            <div className="mb-10">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2 tracking-tight">Select your assessment</h1>
              <p className="text-slate-500 text-[15px]">Choose the curriculum you want to be evaluated on.</p>
            </div>

            {loadingCurricula && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" strokeWidth={2} />
                <p className="text-slate-400 text-sm">Loading available assessments…</p>
              </div>
            )}

            {curriculaError && (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-rose-500" strokeWidth={1.75} />
                </div>
                <p className="text-slate-700 font-medium text-sm">{curriculaError}</p>
                <button
                  onClick={loadCurricula}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Try again
                </button>
              </div>
            )}

            {!loadingCurricula && !curriculaError && curricula.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <Inbox className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
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
                    const color = PALETTE[idx % PALETTE.length];
                    const Icon = CARD_ICONS[idx % CARD_ICONS.length];
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCurriculum(c)}
                        className={`group w-full text-left rounded-2xl border transition-all duration-200 focus:outline-none bg-white p-5 sm:p-6 ${
                          isSelected
                            ? `${color.border} ring-1 ${color.ring} shadow-md`
                            : 'border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-4 sm:gap-5">

                          {/* Icon container */}
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors duration-200 ${
                            isSelected ? color.bg : 'bg-slate-100 group-hover:bg-slate-200'
                          }`}>
                            <Icon className={`w-6 h-6 transition-colors duration-200 ${isSelected ? 'text-white' : 'text-slate-500'}`} strokeWidth={1.75} />
                          </div>

                          {/* Main content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <h3 className="text-[15px] sm:text-base font-bold text-slate-900 leading-snug truncate">
                                  {c.title}
                                </h3>
                                <p className="text-sm text-slate-500 mt-0.5 truncate">
                                  {c.role}
                                  <span className="mx-1.5 text-slate-300">·</span>
                                  <span className="text-slate-400">{c.company}</span>
                                </p>
                              </div>

                              {/* Select indicator (radio) */}
                              <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 mt-0.5 ${
                                isSelected
                                  ? `${color.bg} border-transparent`
                                  : 'border-slate-300 group-hover:border-slate-400'
                              }`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                            </div>

                            {/* Tags row */}
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors duration-200 ${
                                isSelected ? `${color.light} ${color.text}` : 'bg-slate-100 text-slate-500'
                              }`}>
                                {c.sector}
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                <HelpCircle className="w-3.5 h-3.5" strokeWidth={2} />
                                {c.n} questions
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                <Clock className="w-3.5 h-3.5" strokeWidth={2} />
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
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <p className="text-sm text-slate-400">
                    {selectedCurriculum
                      ? <span>Selected: <span className="font-semibold text-slate-700">{selectedCurriculum.title}</span></span>
                      : 'Pick an assessment above to continue'}
                  </p>
                  <button
                    onClick={() => selectedCurriculum && setStep('login')}
                    disabled={!selectedCurriculum}
                    className={`group flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                      selectedCurriculum
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 hover:scale-[1.03] active:scale-[0.98]'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Continue
                    <ArrowRight
                      className={`w-4 h-4 transition-transform duration-200 ${selectedCurriculum ? 'group-hover:translate-x-0.5' : ''}`}
                      strokeWidth={2.5}
                    />
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setStep('select')}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors mb-5"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2} />
              Back
            </button>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-8">
              Assessment: <span className="text-blue-700">{selectedCurriculum?.title}</span>
            </h1>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Exam details card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                <h2 className="text-base font-semibold text-slate-900 mb-5">Assessment Details</h2>
                <div className="space-y-1">
                  {[
                    { label: 'Test Name', value: selectedCurriculum!.title, icon: Briefcase },
                    { label: 'Company',   value: selectedCurriculum!.company, icon: Building2 },
                    { label: 'Role',      value: selectedCurriculum!.role, icon: User },
                    { label: 'Questions', value: `${selectedCurriculum!.n} questions`, icon: FileText },
                    { label: 'Duration',  value: '60 minutes', icon: Clock },
                  ].map(({ label, value, icon: RowIcon }) => (
                    <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                      <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <RowIcon className="w-4 h-4 text-blue-600" strokeWidth={1.75} />
                        {label}
                      </span>
                      <span className="text-xs text-slate-800 font-semibold text-right">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 bg-stone-50 border border-slate-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-600 mb-3">Active Monitoring</p>
                  <div className="grid grid-cols-2 gap-y-2.5 gap-x-3">
                    {[
                      { label: 'Tab switching detection',    icon: AppWindow },
                      { label: 'Fullscreen enforcement',     icon: Maximize },
                      { label: 'Periodic camera snapshots',  icon: Camera },
                      { label: 'Copy / paste blocked',       icon: ClipboardX },
                      { label: 'DevTools blocked',           icon: Code2 },
                      { label: 'Multi-monitor detection',    icon: MonitorCheck },
                      { label: 'Mouse leave tracking',       icon: MousePointer2 },
                      { label: 'Focus loss detection',       icon: Focus },
                    ].map(({ label, icon: PointIcon }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <PointIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" strokeWidth={1.75} />
                        <p className="text-[11px] text-slate-500 leading-snug">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Login form */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
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
                                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-slate-300 ${
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
                                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-slate-300 ${
                        errors.email ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white'
                      }`}
                    />
                    {errors.email && <p className="text-rose-500 text-xs mt-1.5">{errors.email}</p>}
                  </div>

                  <button
                    onClick={handleStart}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                  >
                    Proceed to Exam
                    <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom branding mark */}
            <div className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-blue-600 font-bold text-sm select-none pointer-events-none">
              P
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <p className="flex items-center justify-center gap-1.5 text-slate-400 text-xs text-center">
            <Camera className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            By proceeding, you agree that your activity and periodic camera snapshots will be monitored during the exam.
          </p>
        </div>
      </footer>
    </div>
  );
}
