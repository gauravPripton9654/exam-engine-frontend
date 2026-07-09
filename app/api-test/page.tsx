'use client';

import { useState } from 'react';

type Result =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'success'; status: number; body: string }
  | { state: 'error'; message: string };

export default function ApiTestPage() {
  const [url, setUrl] = useState('https://democrat-wanted-chasing.ngrok-free.dev/animals?skip=0&limit=10');
  const [result, setResult] = useState<Result>({ state: 'idle' });

  const runTest = async () => {
    setResult({ state: 'loading' });
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      const text = await res.text();
      setResult({ state: 'success', status: res.status, body: text });
    } catch (e) {
      // A CORS failure surfaces here as a generic "Failed to fetch" TypeError —
      // the browser hides the real reason from JS; check DevTools console for the CORS message.
      setResult({ state: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">API / CORS Test</h1>
        <p className="text-slate-500 text-sm mb-6">
          Fetches a URL from this page&apos;s origin (browser fetch) so CORS is actually enforced,
          unlike testing with curl.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
          />
          <button
            onClick={runTest}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            Test
          </button>
        </div>

        {result.state === 'loading' && (
          <p className="text-slate-500 text-sm">Fetching…</p>
        )}

        {result.state === 'success' && (
          <div className="bg-white border border-emerald-200 rounded-xl p-4">
            <p className="text-emerald-700 text-sm font-semibold mb-2">
              Success — HTTP {result.status} (no CORS error)
            </p>
            <pre className="text-xs bg-slate-50 rounded-lg p-3 overflow-auto max-h-64">{result.body}</pre>
          </div>
        )}

        {result.state === 'error' && (
          <div className="bg-white border border-rose-200 rounded-xl p-4">
            <p className="text-rose-700 text-sm font-semibold mb-2">Request failed</p>
            <p className="text-slate-600 text-xs font-mono mb-2">{result.message}</p>
            <p className="text-slate-400 text-xs">
              If this says &quot;Failed to fetch&quot;, open DevTools → Console for the real reason —
              it&apos;s almost always a missing <code>Access-Control-Allow-Origin</code> header on the
              server&apos;s response (a CORS block).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
