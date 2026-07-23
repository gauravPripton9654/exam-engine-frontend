'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchSessionDetail, fetchQuestions, fetchTranscript } from '@/lib/api';
import { toRuntimeQuestion } from '@/lib/questions';
import { isCorrect } from '@/lib/grading';
import { SessionDetail, Question, AnswerValue, VIOLATION_CONFIG, TranscriptStatus } from '@/types';

const MODE_BADGE: Record<string, string> = {
  easy:   'bg-slate-100 text-slate-600',
  medium: 'bg-amber-50 text-amber-700',
  hard:   'bg-rose-50 text-rose-700',
};

const STATUS_BADGE: Record<string, string> = {
  submitted:     'bg-emerald-50 text-emerald-700',
  terminated:    'bg-rose-50 text-rose-700',
  'in-progress': 'bg-blue-50 text-blue-700',
  setup:         'bg-slate-100 text-slate-600',
};

const SEVERITY_BADGE: Record<string, string> = {
  low:    'bg-amber-50 text-amber-700',
  medium: 'bg-orange-50 text-orange-700',
  high:   'bg-rose-50 text-rose-700',
};

interface FaceDetectionData {
  status?: unknown;
  face_count?: unknown;
}

function getFaceStatus(faceDetection: unknown, error?: string) {
  if (error) return { label: 'Face check failed', className: 'bg-rose-50 text-rose-700' };
  if (!faceDetection || typeof faceDetection !== 'object') {
    return { label: 'Face check unavailable', className: 'bg-slate-100 text-slate-600' };
  }

  const { status, face_count: faceCount } = faceDetection as FaceDetectionData;
  const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : '';
  const countSuffix = typeof faceCount === 'number' ? ` (${faceCount})` : '';

  if (normalizedStatus === 'no_face') {
    return { label: `No face${countSuffix}`, className: 'bg-amber-50 text-amber-700' };
  }
  if (normalizedStatus === 'multiple_faces') {
    return { label: `Multiple faces${countSuffix}`, className: 'bg-rose-50 text-rose-700' };
  }
  if (normalizedStatus) {
    return {
      label: `${normalizedStatus.replace(/_/g, ' ')}${countSuffix}`,
      className: 'bg-emerald-50 text-emerald-700',
    };
  }
  return { label: `Face check complete${countSuffix}`, className: 'bg-slate-100 text-slate-600' };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
}

function formatDuration(startIso: string, endIso: string) {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s}s`;
}

function formatAnswer(q: Question, answer: AnswerValue | undefined): string {
  if (answer === undefined || answer === null) return '— not answered —';

  if (q.qtype === 'MCQ') {
    return q.options[answer as number]?.option_text ?? '— not answered —';
  }

  if (q.qtype === 'Multi') {
    const idxs = answer as number[];
    const labels = idxs.map(i => q.options[i]?.option_text).filter(Boolean);
    return labels.length ? labels.join(', ') : '— not answered —';
  }

  if (q.qtype === 'Match') {
    const map = answer as Record<number, number>;
    return q.pairs
      .map(p => {
        const selectedId = map[p.id];
        const selected = q.pairs.find(pp => pp.id === selectedId);
        return `${p.left_text} → ${selected ? selected.right_text : '—'}`;
      })
      .join('; ');
  }

  if (q.qtype === 'Fill') {
    const map = answer as Record<number, string>;
    return q.blanks
      .map(b => `Blank ${b.blank_index + 1}: "${map[b.blank_index] ?? ''}"`)
      .join('; ');
  }

  return JSON.stringify(answer);
}

export default function AdminSessionDetailPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [detail, setDetail]     = useState<SessionDetail | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [transcript, setTranscript] = useState<{ status: TranscriptStatus; text: string | null; error: string | null } | null>(null);
  const [refreshingTranscript, setRefreshingTranscript] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchSessionDetail(sessionId)
      .then(d => {
        setDetail(d);
        setTranscript({
          status: d.transcript_status ?? 'none',
          text: d.transcript ?? null,
          error: d.transcript_error ?? null,
        });
        return fetchQuestions(d.curriculum_id);
      })
      .then(apiQuestions => setQuestions(apiQuestions.sort((a, b) => a.sort_order - b.sort_order).map(toRuntimeQuestion)))
      .catch(() => setError('Failed to load this session. Is the backend running?'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const refreshTranscript = () => {
    setRefreshingTranscript(true);
    fetchTranscript(sessionId)
      .then(res => setTranscript({ status: res.transcript_status, text: res.transcript, error: res.transcript_error }))
      .catch(() => {})
      .finally(() => setRefreshingTranscript(false));
  };

  return (
    <div className="min-h-screen bg-[#F5F6FB]">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-700">← Back to all attempts</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-5">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && <div className="bg-white rounded-2xl border border-rose-200 p-6 text-sm text-rose-600">{error}</div>}

        {detail && !loading && (
          <>
            {/* Header card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">{detail.candidate_name}</h1>
                  <p className="text-sm text-slate-500">{detail.candidate_email}</p>
                  <p className="text-sm text-slate-600 mt-2">{detail.exam_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${MODE_BADGE[detail.exam_mode]}`}>
                    {detail.exam_mode} mode
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[detail.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {detail.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5">
                {[
                  { label: 'Score',      value: detail.score !== null ? `${detail.score}%` : '—' },
                  { label: 'Answered',   value: `${detail.answered_count}/${detail.total_questions}` },
                  { label: 'Violations', value: String(detail.violation_count) },
                  { label: 'Snapshots',  value: String(detail.snapshots.length) },
                  { label: 'Duration',   value: formatDuration(detail.start_time, detail.end_time) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <p className="text-lg font-semibold text-slate-800">{value}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-4">
                Started {formatDate(detail.start_time)} · Ended {formatDate(detail.end_time)}
              </p>
            </div>

            {/* Answers */}
            {questions.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-700">Answers</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {questions.map((q, i) => {
                    const answer = detail.answers[String(q.id)];
                    const answered = answer !== undefined && answer !== null;
                    const correct = answered && isCorrect(q, answer);
                    return (
                      <div key={q.id} className="p-4 flex items-start gap-3">
                        <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          !answered ? 'bg-slate-100 text-slate-400' : correct ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                        }`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800 font-medium">{q.text}</p>
                          <p className="text-xs text-slate-500 mt-1">{formatAnswer(q, answer)}</p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          !answered ? 'bg-slate-100 text-slate-500' : correct ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {!answered ? 'Skipped' : correct ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Violations */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-700">Violations ({detail.violations.length})</p>
              </div>
              {detail.violations.length === 0 ? (
                <p className="p-4 text-sm text-slate-400">No violations recorded.</p>
              ) : (
                <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                  {detail.violations.map(v => (
                    <div key={v.id} className="p-3 px-5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-800 font-medium">{VIOLATION_CONFIG[v.type]?.label ?? v.type}</p>
                        <p className="text-xs text-slate-500">{v.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${SEVERITY_BADGE[v.severity]}`}>
                          {v.severity}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">{formatDate(String(v.timestamp))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity log */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-700">Activity Log ({detail.activity_log.length} events)</p>
              </div>
              {detail.activity_log.length === 0 ? (
                <p className="p-4 text-sm text-slate-400">No activity recorded for this mode.</p>
              ) : (
                <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto font-mono">
                  {detail.activity_log.map(ev => (
                    <div key={ev.id} className="px-5 py-2 flex items-center justify-between gap-3 text-xs">
                      <span className="text-slate-700">{ev.type}{ev.questionId !== undefined ? ` · Q${ev.questionId}` : ''}</span>
                      <span className="text-slate-400">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Snapshots */}
            {detail.snapshots.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-700">Camera Snapshots ({detail.snapshots.length})</p>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {detail.snapshots.map(snap => {
                    const faceStatus = getFaceStatus(snap.faceDetection, snap.faceDetectionError);
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <div key={snap.id} className="rounded-lg overflow-hidden border border-slate-200">
                        <img src={snap.image} alt="Candidate snapshot" className="w-full h-24 object-cover" />
                        <div className="px-2 pt-1.5">
                          <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize ${faceStatus.className}`}>
                            {faceStatus.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 px-2 py-1">{new Date(snap.timestamp).toLocaleTimeString()}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Voice transcript (hard mode) */}
            {detail.exam_mode === 'hard' && transcript && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Voice Transcript</p>
                  <button
                    onClick={refreshTranscript}
                    disabled={refreshingTranscript}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold disabled:opacity-50"
                  >
                    {refreshingTranscript ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>
                <div className="p-4">
                  {transcript.status === 'none' && (
                    <p className="text-sm text-slate-400">No microphone audio was captured for this session.</p>
                  )}
                  {transcript.status === 'processing' && (
                    <div className="flex items-center gap-2 text-sm text-amber-600">
                      <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      Transcribing…
                    </div>
                  )}
                  {transcript.status === 'done' && (
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {transcript.text || 'No speech detected.'}
                    </p>
                  )}
                  {transcript.status === 'failed' && (
                    <p className="text-sm text-rose-600">
                      Transcription failed{transcript.error ? `: ${transcript.error}` : '.'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
