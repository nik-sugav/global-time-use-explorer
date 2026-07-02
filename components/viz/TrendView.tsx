'use client';

import { useEffect, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ActivityCategory, CountryTrend } from '@/lib/types';
import { CATEGORY_META } from '@/lib/taxonomy';
import { loadTrend } from '@/lib/data/loadData';

const HEADLINE_CATEGORIES: ActivityCategory[] = ['paid_work', 'screen_leisure', 'sleep', 'household'];

export function TrendView({ country }: { country: string }) {
  const [trend, setTrend] = useState<CountryTrend | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadTrend(country)
      .then(setTrend)
      .finally(() => setLoading(false));
  }, [country]);

  if (loading) return <div className="text-sm text-neutral-400">Loading trend…</div>;
  if (!trend || trend.points.length < 2) {
    return (
      <div className="text-sm text-neutral-400">
        No multi-year survey history available for this country — trend view needs at least two measured waves.
      </div>
    );
  }

  const years = trend.points.map((p) => p.year).sort((a, b) => a - b);
  const minYear = years[0]!;
  const maxYear = years[years.length - 1]!;
  const byYear = new Map(trend.points.map((p) => [p.year, p]));

  const chartData: Record<string, number | null>[] = [];
  for (let y = minYear; y <= maxYear; y++) {
    const point = byYear.get(y);
    const row: Record<string, number | null> = { year: y };
    for (const cat of HEADLINE_CATEGORIES) {
      row[cat] = point ? point.categoryMinutes[cat] ?? null : null;
    }
    chartData.push(row);
  }

  return (
    <div>
      <p className="mb-2 text-xs text-neutral-500">
        Only real measured survey years are plotted — gaps between waves are left unconnected rather than
        interpolated{trend.smoothedAvailable ? ', except where noted as a smoothed trend over dense annual data' : ''}.
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="year" type="number" domain={[minYear, maxYear]} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: 'minutes/day', angle: -90, position: 'insideLeft', fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {HEADLINE_CATEGORIES.map((cat) => (
              <Line
                key={cat}
                type="monotone"
                dataKey={cat}
                name={CATEGORY_META[cat].label}
                stroke={CATEGORY_META[cat].color}
                connectNulls={false}
                dot={{ r: 4 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
