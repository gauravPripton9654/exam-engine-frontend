'use client';

export default function AchieverStatusCard({ streakExams, blurb }: { streakExams: number; blurb: string }) {
  return (
    <div className="bg-slate-900 rounded-2xl p-5 flex flex-col h-full relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/20 rounded-full blur-2xl" />

      <p className="text-[11px] font-semibold text-blue-300 uppercase tracking-wider mb-2 relative">
        Achiever Status
      </p>
      <h3 className="text-white text-lg font-semibold mb-2 relative">
        Your streak is {streakExams} exams.
      </h3>
      <p className="text-slate-300 text-xs leading-relaxed mb-4 relative">
        {blurb}
      </p>

      <div className="rounded-xl overflow-hidden mb-4 relative h-24 bg-gradient-to-br from-blue-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <svg className="w-10 h-10 text-blue-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
        </svg>
      </div>

      <button className="mt-auto w-full py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-sm font-semibold transition-colors relative">
        Download Integrity Certificate
      </button>
    </div>
  );
}
