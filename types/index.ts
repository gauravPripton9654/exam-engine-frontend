export type ViolationType =
  | 'TAB_SWITCH'
  | 'MULTIPLE_FACES'
  | 'NO_FACE'
  | 'PHONE_DETECTED'
  | 'WINDOW_BLUR'
  | 'COPY_ATTEMPT'
  | 'PASTE_ATTEMPT'
  | 'FULLSCREEN_EXIT'
  | 'RIGHT_CLICK'
  | 'KEYBOARD_SHORTCUT'
  | 'DEVTOOLS_OPEN'
  | 'MOUSE_INACTIVE'
  | 'SUSPICIOUS_MOUSE'
  | 'EXTRA_MONITOR';

export const VIOLATION_CONFIG: Record<
  ViolationType,
  { label: string; severity: 'low' | 'medium' | 'high'; cooldown: number }
> = {
  TAB_SWITCH:        { label: 'Tab Switch',         severity: 'high',   cooldown: 8000   },
  MULTIPLE_FACES:    { label: 'Multiple Faces',     severity: 'high',   cooldown: 5000   },
  NO_FACE:           { label: 'No Face Detected',   severity: 'medium', cooldown: 10000  },
  PHONE_DETECTED:    { label: 'Phone Detected',     severity: 'high',   cooldown: 6000   },
  WINDOW_BLUR:       { label: 'Window Changed',     severity: 'medium', cooldown: 8000   },
  COPY_ATTEMPT:      { label: 'Copy Attempt',       severity: 'medium', cooldown: 3000   },
  PASTE_ATTEMPT:     { label: 'Paste Attempt',      severity: 'medium', cooldown: 3000   },
  FULLSCREEN_EXIT:   { label: 'Exited Fullscreen',  severity: 'high',   cooldown: 5000   },
  RIGHT_CLICK:       { label: 'Right Click',        severity: 'low',    cooldown: 5000   },
  KEYBOARD_SHORTCUT: { label: 'Blocked Shortcut',   severity: 'low',    cooldown: 3000   },
  DEVTOOLS_OPEN:     { label: 'DevTools Detected',  severity: 'high',   cooldown: 30000  },
  MOUSE_INACTIVE:    { label: 'Mouse Inactive',     severity: 'medium', cooldown: 180000 },
  SUSPICIOUS_MOUSE:  { label: 'Suspicious Mouse',   severity: 'medium', cooldown: 60000  },
  EXTRA_MONITOR:     { label: 'Extra Monitor',      severity: 'high',   cooldown: 30000  },
};

export interface Violation {
  id: string;
  type: ViolationType;
  timestamp: Date;
  description: string;
  screenshot?: string;
  severity: 'low' | 'medium' | 'high';
}

// ── API types ─────────────────────────────────────────────────────────────────

export type QuestionType = 'MCQ' | 'Multi' | 'Match' | 'Fill';

export interface McqOption {
  id: number;
  option_text: string;
  sort_order: number;
  is_correct: boolean;
}

export interface MatchPair {
  id: number;
  left_text: string;
  right_text: string;
  sort_order: number;
}

export interface FillBlank {
  id: number;
  blank_index: number;
  accepted_answers: string[];
  sort_order: number;
}

export interface ApiQuestion {
  id: number;
  qtype: QuestionType;
  stem: string;
  subject: string;
  skill: string;
  level: string;
  rationale: string;
  sort_order: number;
  mcq_options: McqOption[];
  match_pairs: MatchPair[];
  fill_blanks: FillBlank[];
}

export interface CurriculumSummary {
  id: number;
  title: string;
  role: string;
  company: string;
  sector: string;
  n: number;
}

// ── Answer value per question type ────────────────────────────────────────────
// MCQ:   number   (index into mcq_options)
// Multi: number[] (indices of selected options)
// Match: Record<number, number> (pair_id -> selected right option index among shuffled rights)
// Fill:  Record<number, string> (blank_index -> user's typed answer)
export type AnswerValue = number | number[] | Record<number, number> | Record<number, string>;

// ── Question (runtime representation) ────────────────────────────────────────
export interface Question {
  id: number;
  qtype: QuestionType;
  text: string;         // stem
  category: string;     // subject
  skill: string;
  level: string;
  // MCQ / Multi
  options: McqOption[];
  // Match
  pairs: MatchPair[];
  // Fill
  blanks: FillBlank[];
}

export interface ExamConfig {
  id: string;
  name: string;
  duration: number;
  maxViolations: number;
  questions: Question[];
}

export interface CandidateInfo {
  id: string;
  name: string;
  email: string;
}

export interface ExamSession {
  sessionId: string;
  candidate: CandidateInfo;
  exam: ExamConfig;
  startTime: Date;
  endTime?: Date;
  violations: Violation[];
  answers: Record<number, AnswerValue>;
  status: 'setup' | 'in-progress' | 'submitted' | 'terminated';
}

export interface PeriodicSnapshot {
  id: string;
  timestamp: Date;
  image: string;
}

export interface DetectionState {
  faceCount: number;
  phoneDetected: boolean;
  isModelLoading: boolean;
  cameraReady: boolean;
  error: string | null;
}
