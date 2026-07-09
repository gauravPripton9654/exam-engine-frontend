// Mock data for the candidate dashboard. Shaped to match what the real
// backend endpoints should eventually return — swap the constants below
// for API calls once those endpoints exist, without touching the UI.

export interface CandidateProfile {
  name: string;
  id: string;
  avatarInitials: string;
}

export interface HardwareCheckItem {
  label: string;
  status: 'ok' | 'warning' | 'error';
}

export interface UpcomingExam {
  id: string;
  code: string;
  title: string;
  when: string;
  durationMin: number;
  level: 'EASY' | 'INTERMEDIATE' | 'ADVANCED SECURITY';
  accent: 'blue' | 'violet' | 'emerald';
}

export interface ResultPoint {
  label: string;
  score: number;
}

export const candidateProfile: CandidateProfile = {
  name: 'Alex Carter',
  id: 'ID: 8829-QX',
  avatarInitials: 'AC',
};

export const nextAssessmentInMinutes = 134; // 2h 14m

export const hardwareChecks: HardwareCheckItem[] = [
  { label: 'Webcam & Privacy', status: 'ok' },
  { label: 'Microphone', status: 'ok' },
  { label: 'Bandwidth Ping', status: 'warning' },
];

export const upcomingExams: UpcomingExam[] = [
  { id: 'cs', code: 'CS', title: 'Algorithms & Data Structures', when: 'Today · 14:00', durationMin: 120, level: 'ADVANCED SECURITY', accent: 'blue' },
  { id: 'ba', code: 'BA', title: 'Business Analytics Foundations', when: 'Mar 24 · 10:00 AM', durationMin: 90, level: 'INTERMEDIATE', accent: 'violet' },
  { id: 'ux', code: 'UX', title: 'Ethics in Digital Design', when: 'Mar 28 · 11:30 AM', durationMin: 60, level: 'EASY', accent: 'emerald' },
];

export const monthlyResults: ResultPoint[] = [
  { label: 'Oct', score: 68 },
  { label: 'Nov', score: 74 },
  { label: 'Dec', score: 71 },
  { label: 'Jan', score: 79 },
  { label: 'Feb', score: 83 },
  { label: 'Mar', score: 87 },
];

export const quarterlyResults: ResultPoint[] = [
  { label: 'Q4 ’24', score: 71 },
  { label: 'Q1 ’25', score: 83 },
];

export const achieverStatus = {
  streakExams: 12,
  blurb: "You've remained in the top 5% of candidates for academic integrity and focus consistency this semester.",
};
