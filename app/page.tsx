'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { examConfig } from '@/lib/questions';

export default function HomePage() {
  const router = useRouter();
  const [form, setForm]       = useState({ name: '', id: '', email: '' });
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(false);

  // Block mobile/tablet devices — exam requires a laptop or desktop
  useEffect(() => {
    const ua       = navigator.userAgent;
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const small    = window.innerWidth < 1024;
    setIsMobile(mobileUA || small);

    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.id.trim())   e.id   = 'Candidate ID is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStart = () => {
    if (!validate()) return;
    const params = new URLSearchParams({ name: form.name, id: form.id, email: form.email });
    router.push(`/exam?${params.toString()}`);
  };

  // ── Mobile block screen ───────────────────────────────────────────────────────
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

  // ── Normal login screen ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-2xl">🎓</div>
          <h1 className="text-3xl font-bold text-white">ProctorAI</h1>
        </div>
        <p className="text-gray-400">AI-Powered Online Examination Platform</p>
      </div>

      <div className="w-full max-w-2xl grid md:grid-cols-2 gap-6">
        {/* Exam info */}
        <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6">
          <h2 className="text-lg font-bold text-white mb-4">Exam Details</h2>
          <div className="space-y-3">
            {[
              { icon: '📝', label: 'Exam',          value: examConfig.name },
              { icon: '❓', label: 'Questions',      value: `${examConfig.questions.length} MCQ` },
              { icon: '⏱', label: 'Duration',       value: `${examConfig.duration / 60} minutes` },
              { icon: '🛡', label: 'Max Violations', value: `${examConfig.maxViolations}` },
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
          <h2 className="text-lg font-bold text-white mb-4">Candidate Login</h2>
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
              <label className="text-xs text-gray-400 font-medium block mb-1">Candidate ID *</label>
              <input
                type="text"
                value={form.id}
                onChange={e => setForm(p => ({ ...p, id: e.target.value }))}
                placeholder="e.g. CAND-2024-001"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white
                           placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {errors.id && <p className="text-red-400 text-xs mt-1">{errors.id}</p>}
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

      <p className="text-gray-600 text-xs mt-8 text-center">
        By proceeding, you agree that your activity and periodic camera snapshots will be monitored during the exam.
      </p>
    </div>
  );
}
