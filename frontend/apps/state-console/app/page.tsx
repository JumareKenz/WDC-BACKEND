'use client';

import { Sidebar } from '../src/components/Sidebar';
import { TopBar } from '../src/components/TopBar';
import { KpiCards } from '../src/components/KpiCards';
import { Heatmap } from '../src/components/Heatmap';
import { AiInsights } from '../src/components/AiInsights';
import { NeedsAttention } from '../src/components/NeedsAttention';

export default function DashboardPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* KPIs */}
            <KpiCards />

            {/* Heatmap */}
            <Heatmap />

            {/* Bottom row: AI Insights + Needs Attention */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AiInsights />
              <NeedsAttention />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
