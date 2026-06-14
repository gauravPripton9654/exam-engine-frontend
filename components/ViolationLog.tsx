'use client';

import { useState } from 'react';
import { Violation, VIOLATION_CONFIG } from '@/types';

interface ViolationLogProps {
  violations: Violation[];
}

const SEVERITY_BADGE: Record<string, string> = {
  low:    'bg-yellow-900 text-yellow-300 border border-yellow-700',
  medium: 'bg-orange-900 text-orange-300 border border-orange-700',
  high:   'bg-red-900 text-red-300 border border-red-700',
};

export default function ViolationLog({ violations }: ViolationLogProps) {
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);

  const high   = violations.filter(v => v.severity === 'high').length;
  const medium = violations.filter(v => v.severity === 'medium').length;
  const low    = violations.filter(v => v.severity === 'low').length;

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-xl border border-gray-700">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-200">Violation Log</h3>
          <span className="text-xs text-gray-400">{violations.length} total</span>
        </div>
        <div className="flex gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_BADGE.high}`}>H: {high}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_BADGE.medium}`}>M: {medium}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_BADGE.low}`}>L: {low}</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {violations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <div className="text-green-400 text-3xl mb-2">✓</div>
            <p className="text-green-400 text-sm font-medium">No violations</p>
            <p className="text-gray-500 text-xs mt-1">All monitoring checks passed</p>
          </div>
        ) : (
          violations.map(v => (
            <button
              key={v.id}
              onClick={() => setSelectedViolation(selectedViolation?.id === v.id ? null : v)}
              className="w-full text-left"
            >
              <div className={`rounded-lg p-2.5 border transition-all ${
                selectedViolation?.id === v.id
                  ? 'border-blue-500 bg-blue-950/50'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${SEVERITY_BADGE[v.severity]}`}>
                      {v.severity.toUpperCase()[0]}
                    </span>
                    <span className="text-xs text-gray-200 truncate">
                      {VIOLATION_CONFIG[v.type].label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{formatTime(v.timestamp)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1 line-clamp-1">{v.description}</p>

                {/* Expanded view */}
                {selectedViolation?.id === v.id && v.screenshot && (
                  <div className="mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={v.screenshot}
                      alt="Screenshot"
                      className="w-full rounded border border-gray-600 mt-1"
                      style={{ maxHeight: 100, objectFit: 'cover' }}
                    />
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
