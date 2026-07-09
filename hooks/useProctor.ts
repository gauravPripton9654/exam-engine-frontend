'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Violation, ViolationType, VIOLATION_CONFIG, PeriodicSnapshot } from '@/types';

interface UseProctorOptions {
  enabled: boolean;
  onNewViolation?: (v: Violation) => void;
  screenStream: MediaStream | null;
}

export interface ProctorState {
  isReady: boolean;
  isFullscreen: boolean;
  isWindowFocused: boolean;
  violations: Violation[];
  periodicSnapshots: PeriodicSnapshot[];
  cameraError: string | null;
  cameraStream: MediaStream | null;
}

const SNAPSHOT_INTERVAL_MS = 2 * 60 * 1000;  // 2 minutes
const MOUSE_INACTIVE_MS    = 3 * 60 * 1000;  // 3 minutes with no mouse movement
const BOT_CHECK_MS         = 30 * 1000;       // analyze mouse pattern every 30s
const MIN_BOT_SPEEDS       = 20;              // minimum velocity samples needed for bot check

export function useProctor({ enabled, onNewViolation, screenStream }: UseProctorOptions) {
  const [state, setState] = useState<ProctorState>({
    isReady:           false,
    isFullscreen:      false,
    isWindowFocused:   true,
    violations:        [],
    periodicSnapshots: [],
    cameraError:       null,
    cameraStream:      null,
  });

  const cooldownRef       = useRef<Partial<Record<ViolationType, number>>>({});
  const streamRef         = useRef<MediaStream | null>(null);
  const hiddenVideoRef    = useRef<HTMLVideoElement | null>(null);
  const lastMouseMoveRef  = useRef<number>(0);
  const mousePositionsRef = useRef<Array<{ x: number; y: number; t: number }>>([]);

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

  // ── Main effect ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    // Sync fullscreen state immediately — the fullscreenchange event may have fired
    // before this effect registered its listener (race condition on exam start).
    setState(prev => ({
      ...prev,
      isReady:         true,
      isFullscreen:    !!document.fullscreenElement,
      isWindowFocused: document.hasFocus(),
    }));

    // Inactivity timer starts from exam start, not from page load.
    lastMouseMoveRef.current = Date.now();

    // ── Helper ──────────────────────────────────────────────────────────────────
    const reenterFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    };

    // ── Tab / window / fullscreen ───────────────────────────────────────────────
    const onVisibility = () => {
      if (document.hidden) {
        addViolation('TAB_SWITCH', 'Candidate switched browser tab');
      } else {
        reenterFullscreen();
      }
    };

    const onBlur = () => {
      setState(prev => ({ ...prev, isWindowFocused: false }));
      addViolation('WINDOW_BLUR', 'Candidate switched to another application or started screen sharing');
    };
    const onFocus = () => {
      setState(prev => ({ ...prev, isWindowFocused: true }));
      reenterFullscreen();
    };

    const onFsChange = () => {
      const inFs = !!document.fullscreenElement;
      setState(prev => ({ ...prev, isFullscreen: inFs }));
      if (!inFs) {
        addViolation('FULLSCREEN_EXIT', 'Candidate exited fullscreen');
        reenterFullscreen();
      }
    };

    // ── Right-click block ───────────────────────────────────────────────────────
    const onCtxMenu = (e: MouseEvent) => {
      e.preventDefault();
      addViolation('RIGHT_CLICK', 'Right-click blocked');
    };

    // ── Copy / paste / cut clipboard blocking ───────────────────────────────────
    const onCopy  = (e: ClipboardEvent) => { e.preventDefault(); addViolation('COPY_ATTEMPT',  'Copy blocked'); };
    const onPaste = (e: ClipboardEvent) => { e.preventDefault(); addViolation('PASTE_ATTEMPT', 'Paste blocked'); };
    const onCut   = (e: ClipboardEvent) => { e.preventDefault(); addViolation('COPY_ATTEMPT',  'Cut blocked'); };

    // ── Keyboard shortcut blocking ──────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl  = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const key   = e.key.toLowerCase();

      if (ctrl && key === 'c') {
        e.preventDefault();
        addViolation('COPY_ATTEMPT', 'Copy shortcut blocked (Ctrl+C)');
      } else if (ctrl && key === 'v') {
        e.preventDefault();
        addViolation('PASTE_ATTEMPT', 'Paste shortcut blocked (Ctrl+V)');
      } else if (ctrl && key === 'x') {
        e.preventDefault();
        addViolation('COPY_ATTEMPT', 'Cut shortcut blocked (Ctrl+X)');
      } else if (
        e.key === 'F12' ||
        e.key === 'PrintScreen' ||
        (ctrl && shift && ['i', 'j', 'c', 'k'].includes(key)) ||
        (ctrl && ['u', 's', 'p', 'a'].includes(key))
      ) {
        e.preventDefault();
        addViolation('KEYBOARD_SHORTCUT', `Blocked: ${e.key}`);
      }
    };

    // ── Text selection / drag blocking ──────────────────────────────────────────
    const onSelectStart = (e: Event)     => e.preventDefault();
    const onDragStart   = (e: DragEvent) => e.preventDefault();

    // ── Mouse position tracking ─────────────────────────────────────────────────
    const onMouseMove = (e: MouseEvent) => {
      lastMouseMoveRef.current = Date.now();
      mousePositionsRef.current.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (mousePositionsRef.current.length > 200) mousePositionsRef.current.shift();
    };

    // ── DevTools detection (window-size heuristic, every 3 s) ──────────────────
    // When DevTools is docked to the side: outerWidth − innerWidth grows > 160 px.
    // When docked at bottom: outerHeight − innerHeight grows > 250 px.
    const checkDevTools = () => {
      const wDiff = window.outerWidth  - window.innerWidth  > 160;
      const hDiff = window.outerHeight - window.innerHeight > 250;
      if (wDiff || hDiff) addViolation('DEVTOOLS_OPEN', 'Developer tools detected');
    };

    // ── Extra monitor detection (screen.isExtended, every 5 s) ─────────────────
    // screen.isExtended is true when a second display is connected in extended mode.
    const checkExtraMonitor = () => {
      const extended = ('isExtended' in window.screen)
        ? (window.screen as typeof window.screen & { isExtended: boolean }).isExtended === true
        : false;
      if (extended) addViolation('EXTRA_MONITOR', 'Extra monitor connected during exam');
    };

    // ── Mouse inactivity check (every 60 s) ────────────────────────────────────
    const checkInactivity = () => {
      if (Date.now() - lastMouseMoveRef.current > MOUSE_INACTIVE_MS) {
        addViolation('MOUSE_INACTIVE', 'No mouse activity for 3+ minutes');
      }
    };

    // ── Mouse bot-pattern detection (every 30 s) ────────────────────────────────
    // Robots move at suspiciously constant speed: coefficient of variation (CV) < 0.05.
    // Human CV is typically 0.3–0.8 due to natural acceleration/deceleration.
    const checkBotPattern = () => {
      const pts = mousePositionsRef.current.slice();
      if (pts.length < 25) return;

      const speeds: number[] = [];
      for (let i = 1; i < pts.length; i++) {
        const dt = pts[i].t - pts[i - 1].t;
        if (dt <= 0) continue;
        const dx = pts[i].x - pts[i - 1].x;
        const dy = pts[i].y - pts[i - 1].y;
        const speed = Math.sqrt(dx * dx + dy * dy) / dt;
        if (speed > 0.05) speeds.push(speed); // filter hovering / stillness
      }

      if (speeds.length < MIN_BOT_SPEEDS) return;

      const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      if (mean < 0.02) return;

      const variance = speeds.reduce((a, v) => a + (v - mean) ** 2, 0) / speeds.length;
      const cv       = Math.sqrt(variance) / mean;

      if (cv < 0.05) {
        addViolation('SUSPICIOUS_MOUSE', 'Robotic mouse movement pattern detected');
        mousePositionsRef.current = [];
      }
    };

    // ── Monitor the required screen-share stream ────────────────────────────────
    // If the candidate stops sharing (track ends), treat it as a violation and
    // hide the exam content by marking the window as unfocused.
    let screenTrackCleanup: (() => void) | null = null;
    if (screenStream) {
      const track = screenStream.getVideoTracks()[0];
      if (track) {
        const onScreenEnded = () => {
          addViolation('SCREEN_SHARE_ATTEMPT', 'Screen monitoring was stopped by the candidate');
          setState(prev => ({ ...prev, isWindowFocused: false }));
        };
        track.addEventListener('ended', onScreenEnded);
        screenTrackCleanup = () => track.removeEventListener('ended', onScreenEnded);
      }
    }

    // ── Block getDisplayMedia (screen sharing) from this page ──────────────────
    // Catches Chrome extensions or injected scripts that try to capture the
    // screen from within the exam tab. Meet/Zoom in OTHER tabs can't be blocked
    // this way, but the tab-switch / window-blur listeners above catch the
    // moment the user leaves to set up external screen sharing.
    const origGetDisplayMedia = navigator.mediaDevices.getDisplayMedia?.bind(navigator.mediaDevices);
    if (origGetDisplayMedia) {
      (navigator.mediaDevices as MediaDevices & { getDisplayMedia: typeof origGetDisplayMedia }).getDisplayMedia =
        async (...args: Parameters<typeof origGetDisplayMedia>) => {
          addViolation('SCREEN_SHARE_ATTEMPT', 'Screen sharing attempt detected and blocked');
          void args; // satisfies TS without unreachable code
          throw new DOMException(
            'Screen sharing is not permitted during this exam.',
            'NotAllowedError'
          );
        };
    }

    // ── Register everything ─────────────────────────────────────────────────────
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur',               onBlur);
    window.addEventListener('focus',              onFocus);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('contextmenu',      onCtxMenu);
    document.addEventListener('copy',             onCopy        as EventListener);
    document.addEventListener('paste',            onPaste       as EventListener);
    document.addEventListener('cut',              onCut         as EventListener);
    document.addEventListener('keydown',          onKeyDown);
    document.addEventListener('selectstart',      onSelectStart);
    document.addEventListener('dragstart',        onDragStart   as EventListener);
    document.addEventListener('mousemove',        onMouseMove);

    const devToolsInterval    = setInterval(checkDevTools,    3000);
    const extraMonitorInterval = setInterval(checkExtraMonitor, 5000);
    const inactivityInterval  = setInterval(checkInactivity,  60_000);
    const botInterval         = setInterval(checkBotPattern,  BOT_CHECK_MS);

    // ── Hidden camera for periodic snapshots ────────────────────────────────────
    let snapshotInterval: ReturnType<typeof setInterval> | null = null;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
      .then(stream => {
        streamRef.current = stream;
        setState(prev => ({ ...prev, cameraStream: stream }));
        const video = document.createElement('video');
        video.muted       = true;
        video.playsInline = true;
        video.srcObject   = stream;

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
      window.removeEventListener('blur',               onBlur);
      window.removeEventListener('focus',              onFocus);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('contextmenu',      onCtxMenu);
      document.removeEventListener('copy',             onCopy        as EventListener);
      document.removeEventListener('paste',            onPaste       as EventListener);
      document.removeEventListener('cut',              onCut         as EventListener);
      document.removeEventListener('keydown',          onKeyDown);
      document.removeEventListener('selectstart',      onSelectStart);
      document.removeEventListener('dragstart',        onDragStart   as EventListener);
      document.removeEventListener('mousemove',        onMouseMove);
      clearInterval(devToolsInterval);
      clearInterval(extraMonitorInterval);
      clearInterval(inactivityInterval);
      clearInterval(botInterval);
      if (snapshotInterval) clearInterval(snapshotInterval);
      screenTrackCleanup?.();
      // Restore original getDisplayMedia on exam end
      if (origGetDisplayMedia) {
        (navigator.mediaDevices as MediaDevices & { getDisplayMedia: typeof origGetDisplayMedia }).getDisplayMedia =
          origGetDisplayMedia;
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
      hiddenVideoRef.current = null;
      setState(prev => ({ ...prev, isReady: false, isFullscreen: false, cameraStream: null }));
    };
  }, [enabled, addViolation]);

  return { ...state, addViolation };
}
