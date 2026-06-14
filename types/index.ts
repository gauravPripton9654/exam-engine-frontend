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
  | 'KEYBOARD_SHORTCUT';

export const VIOLATION_CONFIG: Record<
  ViolationType,
  { label: string; severity: 'low' | 'medium' | 'high'; cooldown: number }
> = {
  TAB_SWITCH:        { label: 'Tab Switch',         severity: 'high',   cooldown: 8000  },
  MULTIPLE_FACES:    { label: 'Multiple Faces',     severity: 'high',   cooldown: 5000  },
  NO_FACE:           { label: 'No Face Detected',   severity: 'medium', cooldown: 10000 },
  PHONE_DETECTED:    { label: 'Phone Detected',     severity: 'high',   cooldown: 6000  },
  WINDOW_BLUR:       { label: 'Window Changed',     severity: 'medium', cooldown: 8000  },
  COPY_ATTEMPT:      { label: 'Copy Attempt',       severity: 'low',    cooldown: 3000  },
  PASTE_ATTEMPT:     { label: 'Paste Attempt',      severity: 'low',    cooldown: 3000  },
  FULLSCREEN_EXIT:   { label: 'Exited Fullscreen',  severity: 'high',   cooldown: 5000  },
  RIGHT_CLICK:       { label: 'Right Click',        severity: 'low',    cooldown: 5000  },
  KEYBOARD_SHORTCUT: { label: 'Blocked Shortcut',   severity: 'low',    cooldown: 3000  },
};

export interface Violation {
  id: string;
  type: ViolationType;
  timestamp: Date;
  description: string;
  screenshot?: string;
  severity: 'low' | 'medium' | 'high';
}

export interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  category: string;
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
  answers: Record<number, number>;
  status: 'setup' | 'in-progress' | 'submitted' | 'terminated';
}

export interface DetectionState {
  faceCount: number;
  phoneDetected: boolean;
  isModelLoading: boolean;
  cameraReady: boolean;
  error: string | null;
}
