'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Violation, ViolationType, VIOLATION_CONFIG, PeriodicSnapshot } from '@/types';

interface UseProctorOptions {
  enabled: boolean;
  onNewViolation?: (v: Violation) => void;
}

export interface ProctorState {
  isReady: boolean;
  violations: Violation[];
  periodicSnapshots: PeriodicSnapshot[];
  cameraError: string | null;
}

const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useProctor({ enabled, onNewViolation }: UseProctorOptions) {
  const [state, setState] = useState<ProctorState>({
    isReady: false,
    violations: [],
    periodicSnapshots: [],
    cameraError: null,
  });

  const cooldownRef    = useRef<Partial<Record<ViolationType, number>>>({});
  const streamRef      = useRef<MediaStream | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);

  // ── Violation dispatcher ────────────────────────────────────────────────────
  const addViolation = useCallback((type: ViolationType, description?: string): Violation | undefined => {
    const now  = Date.now();
    const last = cooldownRef.current[type] ?? 0;
    if (now - last < VIOLATION_CONFIG[type].cooldown) return;
    cooldownRef.current[type] = now;

    const violation: Violation = {
      id:          `${type}-${now}`,
      type,
      timestamp:   new Date(),
      description: description ?? VIOLATION_CONFIG[type].label,
      severity:    VIOLATION_CONFIG[type].severity,
    };

    setState(prev => ({ ...prev, violations: [violation, ...prev.violations] }));
    onNewViolation?.(violation);
    return violation;
  }, [onNewViolation]);

  // ── Main effect: behavioural listeners + camera + snapshot timer ────────────
  useEffect(() => {
    if (!enabled) return;
    setState(prev => ({ ...prev, isReady: true }));

    // Behavioural listeners
    const onVisibility = () => {
      if (document.hidden) addViolation('TAB_SWITCH', 'Candidate switched browser tab');
    };
    const onBlur      = () => addViolation('WINDOW_BLUR', 'Candidate switched to another application');
    const onFsChange  = () => {
      if (!document.fullscreenElement) addViolation('FULLSCREEN_EXIT', 'Candidate exited fullscreen');
    };
    const onCtxMenu   = (e: MouseEvent) => {
      e.preventDefault();
      addViolation('RIGHT_CLICK', 'Right-click blocked');
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('contextmenu', onCtxMenu);

    // Hidden camera stream for periodic snapshots
    let snapshotInterval: ReturnType<typeof setInterval> | null = null;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
      .then(stream => {
        streamRef.current = stream;
        const video = document.createElement('video');
        video.muted      = true;
        video.playsInline = true;
        video.srcObject  = stream;

        video.onloadedmetadata = () => {
          video.play();
          hiddenVideoRef.current = video;

          const captureSnapshot = () => {
            if (!video.videoWidth) return;
            try {
              const canvas = document.createElement('canvas');
              canvas.width  = video.videoWidth;
              canvas.height = video.videoHeight;
              canvas.getContext('2d')?.drawImage(video, 0, 0);
              const image = canvas.toDataURL('image/jpeg', 0.8);
              setState(prev => ({
                ...prev,
                periodicSnapshots: [
                  ...prev.periodicSnapshots,
                  { id: `snap-${Date.now()}`, timestamp: new Date(), image },
                ],
              }));
            } catch { /* ignore canvas errors */ }
          };

          snapshotInterval = setInterval(captureSnapshot, SNAPSHOT_INTERVAL_MS);
        };
      })
      .catch(() => {
        setState(prev => ({
          ...prev,
          cameraError: 'Camera access denied — periodic snapshots disabled.',
        }));
      });

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('contextmenu', onCtxMenu);
      if (snapshotInterval) clearInterval(snapshotInterval);
      streamRef.current?.getTracks().forEach(t => t.stop());
      hiddenVideoRef.current = null;
      setState(prev => ({ ...prev, isReady: false }));
    };
  }, [enabled, addViolation]);

  const requestFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  return { ...state, addViolation, requestFullscreen };
}
