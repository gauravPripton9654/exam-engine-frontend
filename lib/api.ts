import axios from 'axios';
import { ApiQuestion, CurriculumSummary, SessionData, SessionSummary, SessionDetail, TranscriptResult, QuestionType } from '@/types';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

export async function fetchCurricula(skip = 0, limit = 20): Promise<CurriculumSummary[]> {
  const { data } = await api.get<CurriculumSummary[]>('/curricula/', { params: { skip, limit } });
  return data;
}

export async function fetchCurriculum(id: number): Promise<CurriculumSummary> {
  const { data } = await api.get<CurriculumSummary>(`/curricula/${id}`);
  return data;
}

export async function fetchQuestions(curriculumId: number): Promise<ApiQuestion[]> {
  const { data } = await api.get<ApiQuestion[]>(`/curricula/${curriculumId}/questions`);
  return data;
}

// ── Curriculum & question management (admin CRUD) ────────────────────────────

export interface CurriculumPatch {
  title?: string;
  role?: string;
  company?: string;
  sector?: string;
}

export async function updateCurriculum(id: number, patch: CurriculumPatch): Promise<CurriculumSummary> {
  const { data } = await api.patch<CurriculumSummary>(`/curricula/${id}`, patch);
  return data;
}

export async function deleteCurriculum(id: number): Promise<void> {
  await api.delete(`/curricula/${id}`);
}

export interface QuestionInput {
  qtype?: QuestionType;
  stem?: string;
  subject?: string;
  skill?: string;
  level?: string;
  rationale?: string;
  mcq_options?: { option_text: string; is_correct: boolean }[];
  match_pairs?: { left_text: string; right_text: string }[];
  fill_blanks?: { blank_index: number; accepted_answers: string[] }[];
}

export async function createQuestion(curriculumId: number, question: QuestionInput): Promise<ApiQuestion> {
  const { data } = await api.post<ApiQuestion>(`/curricula/${curriculumId}/questions`, question);
  return data;
}

export async function updateQuestion(curriculumId: number, questionId: number, patch: QuestionInput): Promise<ApiQuestion> {
  const { data } = await api.patch<ApiQuestion>(`/curricula/${curriculumId}/questions/${questionId}`, patch);
  return data;
}

export async function deleteQuestion(curriculumId: number, questionId: number): Promise<void> {
  await api.delete(`/curricula/${curriculumId}/questions/${questionId}`);
}

// ── Exam sessions (proctoring results) ───────────────────────────────────────

export async function saveExamSession(session: SessionData): Promise<void> {
  await api.post('/sessions/', session);
}

export interface SessionListParams {
  skip?: number;
  limit?: number;
  curriculum_id?: number;
  candidate_email?: string;
  status?: string;
}

export async function fetchSessions(params: SessionListParams = {}): Promise<SessionSummary[]> {
  const { data } = await api.get<SessionSummary[]>('/sessions/', { params });
  return data;
}

export async function fetchSessionDetail(sessionId: string): Promise<SessionDetail> {
  const { data } = await api.get<SessionDetail>(`/sessions/${sessionId}`);
  return data;
}

// ── Audio transcription (hard mode) ──────────────────────────────────────────
// The backend transcribes and immediately discards the audio file — only the
// resulting text is kept. Upload kicks off a background job (202); poll
// fetchTranscript() until transcript_status is 'done' or 'failed'.

export async function transcribeSession(sessionId: string, audio: Blob, filename = 'recording.webm'): Promise<void> {
  const formData = new FormData();
  formData.append('audio', audio, filename);
  await api.post(`/sessions/${sessionId}/transcribe`, formData, {
    // Let the browser set the multipart boundary itself — the instance's
    // default 'application/json' header would otherwise break the upload.
    headers: { 'Content-Type': undefined },
  });
}

export async function fetchTranscript(sessionId: string): Promise<TranscriptResult> {
  const { data } = await api.get<TranscriptResult>(`/sessions/${sessionId}/transcript`);
  return data;
}

// ── Local debug aid — NOT part of the exam data pipeline ─────────────────────
// Saves a copy of the recorded audio to this Next.js app's own filesystem
// (app/api/debug-audio) so it can be listened to directly. Hits this app's
// own origin, not the FastAPI backend, so it deliberately bypasses the `api`
// axios instance and its baseURL.

export async function saveDebugAudio(blob: Blob, filename = 'recording.webm'): Promise<void> {
  const formData = new FormData();
  formData.append('audio', blob, filename);
  await fetch('/api/debug-audio', { method: 'POST', body: formData });
}

export default api;
