'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchSessions, fetchCurricula } from '@/lib/api';
import { SessionSummary, CurriculumSummary, ExamMode } from '@/types';

const PAGE_SIZE = 20;

const MODE_BADGE: Record<ExamMode, string> = {
  easy:   'bg-slate-100 text-slate-600',
  medium: 'bg-amber-50 text-amber-700',
  hard:   'bg-rose-50 text-rose-700',
};

const STATUS_BADGE: Record<string, string> = {
  submitted:   'bg-emerald-50 text-emerald-700',
  terminated:  'bg-rose-50 text-rose-700',
  'in-progress': 'bg-blue-50 text-blue-700',
  setup:       'bg-slate-100 text-slate-600',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function AdminSessionsPage() {
  const [sessions, setSessions]         = useState<SessionSummary[]>([]);
  const [curricula, setCurricula]       = useState<CurriculumSummary[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const [curriculumId, setCurriculumId] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [status, setStatus]             = useState('');
  const [page, setPage]                 = useState(0);

  useEffect(() => {
    fetchCurricula(0, 200).then(setCurricula).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchSessions({
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
      curriculum_id: curriculumId ? Number(curriculumId) : undefined,
      candidate_email: candidateEmail || undefined,
      status: status || undefined,
    })
      .then(setSessions)
      .catch(() => setError('Failed to load exam sessions. Is the backend running?'))
      .finally(() => setLoading(false));
  }, [page, curriculumId, candidateEmail, status]);

  useEffect(() => { load(); }, [load]);

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    load();
  };

  return (
    <div className="min-h-screen bg-[#F5F6FB]">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900 text-sm tracking-tight">Pripton</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-500">Admin · Exam Analytics</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Exam Attempts</h1>
          <p className="text-slate-500 text-sm mt-1">Every candidate session recorded across all exams.</p>
        </div>

        {/* Filters */}
        <form onSubmit={applyFilters} className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Exam</label>
            <select
              value={curriculumId}
              onChange={e => setCurriculumId(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 min-w-[200px] bg-white"
            >
              <option value="">All exams</option>
              {curricula.map(c => (
                <option key={c.id} value={c.id}>{c.title} — {c.role}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Candidate email</label>
            <input
              value={candidateEmail}
              onChange={e => setCandidateEmail(e.target.value)}
              placeholder="name@example.com"
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 min-w-[220px]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 min-w-[160px] bg-white"
            >
              <option value="">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="terminated">Terminated</option>
              <option value="in-progress">In progress</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Apply Filters
          </button>
        </form>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-10 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="p-10 text-center text-sm text-rose-600">{error}</div>
          ) : sessions.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">No exam attempts match these filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs">Candidate</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs">Exam</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs">Mode</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs">Score</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs">Violations</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs">Answered</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs">Submitted</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{s.candidate_name}</p>
                        <p className="text-xs text-slate-400">{s.candidate_email}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate">{s.exam_name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${MODE_BADGE[s.exam_mode]}`}>
                          {s.exam_mode}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{s.score ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[s.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={s.violation_count > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500'}>
                          {s.violation_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{s.answered_count}/{s.total_questions}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(s.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/${s.session_id}`} className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage(p => Math.max(p - 1, 0))}
            disabled={page === 0}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white"
          >
            ← Previous
          </button>
          <span className="text-xs text-slate-400">Page {page + 1}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={sessions.length < PAGE_SIZE}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white"
          >
            Next →
          </button>
        </div>
      </main>
    </div>
  );
}
