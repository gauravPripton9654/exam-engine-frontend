'use client';

import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import SystemHealthCard from '@/components/dashboard/SystemHealthCard';
import UpcomingExamsCard from '@/components/dashboard/UpcomingExamsCard';
import HistoricalResultsChart from '@/components/dashboard/HistoricalResultsChart';
import AchieverStatusCard from '@/components/dashboard/AchieverStatusCard';
import {
  candidateProfile,
  nextAssessmentInMinutes,
  hardwareChecks,
  upcomingExams,
  achieverStatus,
} from '@/lib/mockDashboard';

function formatEta(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} minutes`;
  return `${h} hour${h > 1 ? 's' : ''} and ${m} minutes`;
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#F5F6FB] flex">
      <DashboardSidebar profile={candidateProfile} active="overview" />

      <main className="flex-1 min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-base font-semibold text-slate-900">Overview</h1>
          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              {candidateProfile.avatarInitials}
            </div>
          </div>
        </header>

        <div className="max-w-6xl px-8 py-6 space-y-6">
          {/* Welcome banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Welcome back, {candidateProfile.name.split(' ')[0]}
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Your next scheduled assessment is in{' '}
                <span className="font-medium text-slate-700">{formatEta(nextAssessmentInMinutes)}</span>.
              </p>
            </div>
            <button className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shrink-0">
              Start Hardware Verification
            </button>
          </div>

          {/* System health + upcoming exams */}
          <div className="grid md:grid-cols-2 gap-6">
            <SystemHealthCard checks={hardwareChecks} />
            <UpcomingExamsCard exams={upcomingExams} />
          </div>

          {/* Historical results + achiever status */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <HistoricalResultsChart />
            </div>
            <AchieverStatusCard streakExams={achieverStatus.streakExams} blurb={achieverStatus.blurb} />
          </div>
        </div>
      </main>
    </div>
  );
}
