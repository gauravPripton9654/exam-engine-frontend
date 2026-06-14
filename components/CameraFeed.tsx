'use client';

import { RefObject } from 'react';

interface CameraFeedProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  faceCount: number;
  phoneDetected: boolean;
  isModelLoading: boolean;
  cameraError: string | null;
  modelLoadError: string | null;
  isReady: boolean;
}

export default function CameraFeed({
  videoRef,
  canvasRef,
  faceCount,
  phoneDetected,
  isModelLoading,
  cameraError,
  modelLoadError,
  isReady,
}: CameraFeedProps) {
  const faceStatus =
    faceCount === 0 ? { label: 'No face',       color: 'text-yellow-400', dot: 'bg-yellow-400' }
    : faceCount === 1 ? { label: '1 face',       color: 'text-green-400',  dot: 'bg-green-400'  }
    :                   { label: `${faceCount} faces!`, color: 'text-red-400 font-bold', dot: 'bg-red-400 animate-pulse' };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-xs text-gray-300 font-medium">Live Camera</span>
        </div>
        <div className="flex items-center gap-3">
          {isReady && (
            <>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${faceStatus.dot}`} />
                <span className={`text-xs ${faceStatus.color}`}>{faceStatus.label}</span>
              </div>
              {phoneDetected && (
                <div className="flex items-center gap-1 bg-red-900/80 border border-red-700 rounded px-2 py-0.5">
                  <span className="text-red-300 text-xs font-bold animate-pulse">PHONE</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Video container */}
      <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
        {/* Loading overlay */}
        {(isModelLoading || !isReady) && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-900">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-400 text-xs text-center px-4">
              {isModelLoading ? 'Loading AI models…' : 'Accessing camera…'}
            </p>
            <p className="text-gray-600 text-xs mt-1">First load may take 10–15 s (caches after)</p>
          </div>
        )}

        {/* Camera error */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-900 p-4">
            <p className="text-red-400 text-3xl mb-3">&#x1F4F7;</p>
            <p className="text-red-400 text-xs text-center font-semibold">{cameraError}</p>
            <p className="text-gray-500 text-xs text-center mt-2">Allow camera access and reload.</p>
          </div>
        )}

        {/* Video + canvas overlay */}
        <video
          ref={videoRef}
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        {/* Canvas mirrors the video so boxes align with the mirrored feed */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Violation overlays */}
        {faceCount > 1 && isReady && (
          <div className="absolute top-2 left-2 right-2 bg-red-900/90 border border-red-500 rounded-lg px-3 py-2 z-20">
            <p className="text-red-300 text-xs font-bold text-center">
              MULTIPLE FACES DETECTED — Logged
            </p>
          </div>
        )}
        {faceCount === 0 && isReady && !isModelLoading && (
          <div className="absolute top-2 left-2 right-2 bg-yellow-900/90 border border-yellow-500 rounded-lg px-3 py-2 z-20">
            <p className="text-yellow-300 text-xs font-bold text-center">
              FACE NOT VISIBLE — Please look at the camera
            </p>
          </div>
        )}
        {phoneDetected && isReady && (
          <div className="absolute bottom-2 left-2 right-2 bg-red-900/90 border border-red-500 rounded-lg px-3 py-2 z-20">
            <p className="text-red-300 text-xs font-bold text-center">
              PHONE DETECTED — This has been recorded
            </p>
          </div>
        )}
      </div>

      {/* Model load warning (non-fatal — camera still works) */}
      {modelLoadError && (
        <div className="px-3 py-2 bg-yellow-900/40 border-t border-yellow-700">
          <p className="text-yellow-300 text-xs">{modelLoadError}</p>
        </div>
      )}

      {/* Status bar */}
      <div className="px-3 py-2 bg-gray-800/50 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {isReady ? 'AI Proctoring Active' : 'Initializing…'}
        </span>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>Face: {isReady ? (faceCount > 0 ? '✓' : '✗') : '—'}</span>
          <span>Phone: {isReady ? (phoneDetected ? '!' : '✓') : '—'}</span>
        </div>
      </div>
    </div>
  );
}
