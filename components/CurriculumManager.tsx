'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchCurricula, fetchQuestions, updateCurriculum, deleteCurriculum,
  createQuestion, updateQuestion, deleteQuestion,
  CurriculumPatch, QuestionInput,
} from '@/lib/api';
import { ApiQuestion, CurriculumSummary, QuestionType } from '@/types';

const QTYPE_LABEL: Record<QuestionType, string> = {
  MCQ: 'MCQ', Multi: 'Multi-select', Match: 'Matching', Fill: 'Fill in blank',
};

type MetaSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function CurriculumManager() {
  const [curricula, setCurricula]           = useState<CurriculumSummary[]>([]);
  const [loadingCurricula, setLoadingCurricula] = useState(true);
  const [curriculaError, setCurriculaError]  = useState<string | null>(null);

  const [selectedId, setSelectedId]         = useState<number | null>(null);
  const [questions, setQuestions]           = useState<ApiQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  const [meta, setMeta]                     = useState<CurriculumPatch>({});
  const [metaStatus, setMetaStatus]         = useState<MetaSaveStatus>('idle');

  const [questionEditor, setQuestionEditor] = useState<'create' | number | null>(null);

  const loadCurricula = useCallback(() => {
    setLoadingCurricula(true);
    setCurriculaError(null);
    fetchCurricula(0, 200)
      .then(setCurricula)
      .catch(() => setCurriculaError('Failed to load curricula. Is the backend running?'))
      .finally(() => setLoadingCurricula(false));
  }, []);

  useEffect(() => { loadCurricula(); }, [loadCurricula]);

  const selected = curricula.find(c => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    setMeta({ title: selected.title, role: selected.role, company: selected.company, sector: selected.sector });
    setMetaStatus('idle');
  }, [selected]);

  const loadQuestions = useCallback((id: number) => {
    setLoadingQuestions(true);
    setQuestionsError(null);
    fetchQuestions(id)
      .then(qs => setQuestions([...qs].sort((a, b) => a.sort_order - b.sort_order)))
      .catch(() => setQuestionsError('Failed to load questions for this curriculum.'))
      .finally(() => setLoadingQuestions(false));
  }, []);

  useEffect(() => {
    setQuestionEditor(null);
    if (selectedId !== null) loadQuestions(selectedId);
    else setQuestions([]);
  }, [selectedId, loadQuestions]);

  const handleSaveMeta = async () => {
    if (!selected) return;
    setMetaStatus('saving');
    try {
      await updateCurriculum(selected.id, meta);
      setMetaStatus('saved');
      loadCurricula();
    } catch {
      setMetaStatus('error');
    }
  };

  const handleDeleteCurriculum = async (id: number) => {
    if (!window.confirm('Delete this curriculum and all of its questions? Existing exam sessions keep their record but lose the link.')) return;
    try {
      await deleteCurriculum(id);
      if (selectedId === id) setSelectedId(null);
      loadCurricula();
    } catch {
      alert('Failed to delete curriculum.');
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!selectedId) return;
    if (!window.confirm('Delete this question?')) return;
    try {
      await deleteQuestion(selectedId, questionId);
      loadQuestions(selectedId);
    } catch {
      alert('Failed to delete question.');
    }
  };

  return (
    <div className="grid grid-cols-[300px_1fr] gap-5 p-6" style={{ minHeight: 'calc(100vh - 56px)' }}>
      {/* Left: curriculum list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden h-fit">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700">Curricula</p>
        </div>
        {loadingCurricula ? (
          <div className="p-6 flex justify-center">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : curriculaError ? (
          <p className="p-4 text-xs text-rose-600">{curriculaError}</p>
        ) : curricula.length === 0 ? (
          <p className="p-4 text-xs text-slate-400">No curricula yet — import one first.</p>
        ) : (
          <div className="divide-y divide-slate-50 max-h-[70vh] overflow-y-auto">
            {curricula.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-4 py-3 cursor-pointer transition-colors ${selectedId === c.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
              >
                <p className={`text-sm font-medium truncate ${selectedId === c.id ? 'text-indigo-700' : 'text-slate-800'}`}>{c.title}</p>
                <p className="text-xs text-slate-400 truncate">{c.role} · {c.company}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-slate-400">{c.n} question{c.n === 1 ? '' : 's'}</span>
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteCurriculum(c.id); }}
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: selected curriculum detail */}
      <div className="space-y-4">
        {!selected ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-400">
            Select a curriculum on the left to edit its details or questions.
          </div>
        ) : (
          <>
            {/* Metadata card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-700">Curriculum Details</p>
                {metaStatus === 'saved' && <span className="text-[11px] text-emerald-600 font-medium">Saved ✓</span>}
                {metaStatus === 'error' && <span className="text-[11px] text-rose-600 font-medium">Failed to save</span>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={meta.title ?? ''} onChange={e => setMeta(m => ({ ...m, title: e.target.value }))}
                  placeholder="Title" className="text-sm border border-slate-200 rounded-lg px-3 py-2" />
                <input value={meta.role ?? ''} onChange={e => setMeta(m => ({ ...m, role: e.target.value }))}
                  placeholder="Role" className="text-sm border border-slate-200 rounded-lg px-3 py-2" />
                <input value={meta.company ?? ''} onChange={e => setMeta(m => ({ ...m, company: e.target.value }))}
                  placeholder="Company" className="text-sm border border-slate-200 rounded-lg px-3 py-2" />
                <input value={meta.sector ?? ''} onChange={e => setMeta(m => ({ ...m, sector: e.target.value }))}
                  placeholder="Sector" className="text-sm border border-slate-200 rounded-lg px-3 py-2" />
              </div>
              <button
                onClick={handleSaveMeta}
                disabled={metaStatus === 'saving'}
                className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                {metaStatus === 'saving' ? 'Saving…' : 'Save Changes'}
              </button>
            </div>

            {/* Questions card */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Questions ({questions.length})</p>
                <button
                  onClick={() => setQuestionEditor(questionEditor === 'create' ? null : 'create')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  {questionEditor === 'create' ? 'Cancel' : '+ Add Question'}
                </button>
              </div>

              {questionEditor === 'create' && (
                <div className="p-4 border-b border-slate-100">
                  <QuestionEditor
                    curriculumId={selected.id}
                    onSaved={() => { setQuestionEditor(null); loadQuestions(selected.id); }}
                    onCancel={() => setQuestionEditor(null)}
                  />
                </div>
              )}

              {loadingQuestions ? (
                <div className="p-6 flex justify-center">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : questionsError ? (
                <p className="p-4 text-xs text-rose-600">{questionsError}</p>
              ) : questions.length === 0 ? (
                <p className="p-4 text-xs text-slate-400">No questions yet.</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {questions.map((q, i) => (
                    <div key={q.id} className="p-4">
                      {questionEditor === q.id ? (
                        <QuestionEditor
                          curriculumId={selected.id}
                          initial={q}
                          onSaved={() => { setQuestionEditor(null); loadQuestions(selected.id); }}
                          onCancel={() => setQuestionEditor(null)}
                        />
                      ) : (
                        <div className="flex items-start gap-3">
                          <span className="text-xs text-slate-400 w-5 shrink-0 mt-0.5">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">{QTYPE_LABEL[q.qtype]}</span>
                            <p className="text-sm text-slate-800 mt-0.5">{q.stem}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <button onClick={() => setQuestionEditor(q.id)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                            <button onClick={() => handleDeleteQuestion(q.id)} className="text-xs text-rose-500 hover:text-rose-700 font-medium">Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Create/edit form for a single question ──────────────────────────────────

interface QuestionEditorProps {
  curriculumId: number;
  initial?: ApiQuestion;
  onSaved: () => void;
  onCancel: () => void;
}

function QuestionEditor({ curriculumId, initial, onSaved, onCancel }: QuestionEditorProps) {
  const [qtype, setQtype] = useState<QuestionType>(initial?.qtype ?? 'MCQ');
  const [stem, setStem] = useState(initial?.stem ?? '');
  const [subject, setSubject] = useState(initial?.subject ?? '');
  const [skill, setSkill] = useState(initial?.skill ?? '');
  const [level, setLevel] = useState(initial?.level ?? '');
  const [rationale, setRationale] = useState(initial?.rationale ?? '');

  const [options, setOptions] = useState<{ text: string; correct: boolean }[]>(
    initial?.mcq_options?.length
      ? [...initial.mcq_options].sort((a, b) => a.sort_order - b.sort_order).map(o => ({ text: o.option_text, correct: o.is_correct }))
      : [{ text: '', correct: false }, { text: '', correct: false }]
  );
  const [pairs, setPairs] = useState<{ left: string; right: string }[]>(
    initial?.match_pairs?.length
      ? [...initial.match_pairs].sort((a, b) => a.sort_order - b.sort_order).map(p => ({ left: p.left_text, right: p.right_text }))
      : [{ left: '', right: '' }]
  );
  const [blanks, setBlanks] = useState<{ answers: string }[]>(
    initial?.fill_blanks?.length
      ? [...initial.fill_blanks].sort((a, b) => a.sort_order - b.sort_order).map(b => ({ answers: b.accepted_answers.join(', ') }))
      : [{ answers: '' }]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQtypeChange = (next: QuestionType) => {
    setQtype(next);
    if (next === 'MCQ' || next === 'Multi') setOptions([{ text: '', correct: false }, { text: '', correct: false }]);
    else if (next === 'Match') setPairs([{ left: '', right: '' }]);
    else if (next === 'Fill') setBlanks([{ answers: '' }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: QuestionInput = {
      qtype,
      stem,
      subject: subject || undefined,
      skill: skill || undefined,
      level: level || undefined,
      rationale: rationale || undefined,
    };

    if (qtype === 'MCQ' || qtype === 'Multi') {
      payload.mcq_options = options
        .filter(o => o.text.trim())
        .map(o => ({ option_text: o.text.trim(), is_correct: o.correct }));
    } else if (qtype === 'Match') {
      payload.match_pairs = pairs
        .filter(p => p.left.trim() && p.right.trim())
        .map(p => ({ left_text: p.left.trim(), right_text: p.right.trim() }));
    } else if (qtype === 'Fill') {
      payload.fill_blanks = blanks
        .map((b, i) => ({ blank_index: i, accepted_answers: b.answers.split(',').map(s => s.trim()).filter(Boolean) }))
        .filter(b => b.accepted_answers.length > 0);
    }

    try {
      if (initial) await updateQuestion(curriculumId, initial.id, payload);
      else await createQuestion(curriculumId, payload);
      onSaved();
    } catch {
      setError('Failed to save question.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-500">Question Type</label>
          <select
            value={qtype}
            onChange={e => handleQtypeChange(e.target.value as QuestionType)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white mt-1"
          >
            <option value="MCQ">MCQ (single answer)</option>
            <option value="Multi">Multi-select</option>
            <option value="Match">Matching</option>
            <option value="Fill">Fill in blank</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Level</label>
          <input value={level} onChange={e => setLevel(e.target.value)} placeholder="Easy / Medium / Hard"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white mt-1" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500">Question Stem</label>
        <textarea value={stem} onChange={e => setStem(e.target.value)} required rows={2}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white mt-1" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white" />
        <input value={skill} onChange={e => setSkill(e.target.value)} placeholder="Skill"
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white" />
      </div>

      <textarea value={rationale} onChange={e => setRationale(e.target.value)} placeholder="Rationale (optional)" rows={2}
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white" />

      {(qtype === 'MCQ' || qtype === 'Multi') && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-500">
            Options — mark the correct {qtype === 'Multi' ? 'answers' : 'answer'}
          </label>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type={qtype === 'MCQ' ? 'radio' : 'checkbox'}
                name="correct-option"
                checked={o.correct}
                onChange={() => setOptions(prev => prev.map((op, idx) =>
                  qtype === 'MCQ' ? { ...op, correct: idx === i } : (idx === i ? { ...op, correct: !op.correct } : op)
                ))}
              />
              <input
                value={o.text}
                onChange={e => setOptions(prev => prev.map((op, idx) => idx === i ? { ...op, text: e.target.value } : op))}
                placeholder={`Option ${i + 1}`}
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
              />
              <button type="button" onClick={() => setOptions(prev => prev.filter((_, idx) => idx !== i))}
                className="text-slate-400 hover:text-rose-600 text-xs">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setOptions(prev => [...prev, { text: '', correct: false }])}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Add option</button>
        </div>
      )}

      {qtype === 'Match' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-500">Match pairs</label>
          {pairs.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={p.left} onChange={e => setPairs(prev => prev.map((pp, idx) => idx === i ? { ...pp, left: e.target.value } : pp))}
                placeholder="Left" className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white" />
              <span className="text-slate-300">→</span>
              <input value={p.right} onChange={e => setPairs(prev => prev.map((pp, idx) => idx === i ? { ...pp, right: e.target.value } : pp))}
                placeholder="Right" className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white" />
              <button type="button" onClick={() => setPairs(prev => prev.filter((_, idx) => idx !== i))}
                className="text-slate-400 hover:text-rose-600 text-xs">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setPairs(prev => [...prev, { left: '', right: '' }])}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Add pair</button>
        </div>
      )}

      {qtype === 'Fill' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-500">Blanks — comma-separated accepted answers</label>
          {blanks.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-16 shrink-0">Blank {i + 1}</span>
              <input value={b.answers} onChange={e => setBlanks(prev => prev.map((bb, idx) => idx === i ? { answers: e.target.value } : bb))}
                placeholder="answer1, answer2" className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white" />
              <button type="button" onClick={() => setBlanks(prev => prev.filter((_, idx) => idx !== i))}
                className="text-slate-400 hover:text-rose-600 text-xs">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setBlanks(prev => [...prev, { answers: '' }])}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Add blank</button>
        </div>
      )}

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors">
          {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Question'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-medium">
          Cancel
        </button>
      </div>
    </form>
  );
}
