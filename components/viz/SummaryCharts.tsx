'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { DayProfile } from '@/lib/types';
import { CATEGORY_META } from '@/lib/taxonomy';
import { DataQualityBadge } from '@/components/data-quality/DataQualityBadge';

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function SummaryCharts({ profile }: { profile: DayProfile | null }) {
  if (!profile) return <div className="text-sm text-neutral-400">Loading…</div>;

  const sorted = [...profile.categoryTotals].sort((a, b) => b.minutes - a.minutes);
  const pieData = sorted.map((ct) => ({ name: CATEGORY_META[ct.category].label, value: ct.minutes, category: ct.category }));

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={1}
              isAnimationActive={false}
            >
              {pieData.map((entry) => (
                <Cell key={entry.category} fill={CATEGORY_META[entry.category].color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatHours(value)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1.5 text-sm">
        {sorted.map((ct) => (
          <li key={ct.category} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_META[ct.category].color }} />
              {CATEGORY_META[ct.category].label}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-neutral-600">{formatHours(ct.minutes)}</span>
              <DataQualityBadge categoryTotal={ct} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
