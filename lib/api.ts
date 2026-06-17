import axios from 'axios';
import { ApiQuestion, CurriculumSummary } from '@/types';

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

export default api;
