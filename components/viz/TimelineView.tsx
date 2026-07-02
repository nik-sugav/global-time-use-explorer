'use client';

import { useMemo } from 'react';
import { scaleLinear } from '@visx/scale';
import { Group } from '@visx/group';
import { AxisBottom } from '@visx/axis';
import type { DayProfile, TimeSlot } from '@/lib/types';
import { CATEGORY_META } from '@/lib/taxonomy';

const WIDTH = 720;
const HEIGHT = 64;
const MARGIN = { top: 4, right: 8, bottom: 22, left: 8 };

interface Segment {
  category: TimeSlot['category'];
  quality: TimeSlot['quality'];
  startSlot: number;
  endSlot: number;
}

function mergeSlotsIntoSegments(slots: TimeSlot[]): Segment[] {
  if (slots.length === 0) return [];
  const segments: Segment[] = [];
  let current: Segment = { category: slots[0]!.category, quality: slots[0]!.quality, startSlot: 0, endSlot: 1 };
  for (let i = 1; i < slots.length; i++) {
    const s = slots[i]!;
    if (s.category === current.category) {
      current.endSlot = i + 1;
    } else {
      segments.push(current);
      current = { category: s.category, quality: s.quality, startSlot: i, endSlot: i + 1 };
    }
  }
  segments.push(current);
  return segments;
}

export function TimelineView({ profile, label }: { profile: DayProfile | null; label?: string }) {
  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
  const barHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const xScale = useMemo(
    () =>
      scaleLinear<number>({
        domain: [0, 96],
        range: [0, innerWidth],
      }),
    [innerWidth]
  );

  const segments = useMemo(() => (profile ? mergeSlotsIntoSegments(profile.slots) : []), [profile]);

  return (
    <div>
      {label && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p>}
      <svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMinYMid meet">
        <Group left={MARGIN.left} top={MARGIN.top}>
          {segments.map((seg, i) => {
            const x = xScale(seg.startSlot);
            const w = xScale(seg.endSlot) - xScale(seg.startSlot);
            const meta = CATEGORY_META[seg.category];
            return (
              <rect
                key={i}
                x={x}
                y={0}
                width={Math.max(w - 0.5, 0)}
                height={barHeight}
                fill={meta.color}
                opacity={seg.quality === 'estimated' ? 0.68 : 1}
                rx={1}
              >
                <title>
                  {meta.label} ({Math.round(((seg.endSlot - seg.startSlot) * 15) / 60 * 10) / 10}h,{' '}
                  {seg.quality})
                </title>
              </rect>
            );
          })}
          <AxisBottom
            top={barHeight}
            scale={xScale.copy().range([0, innerWidth]).domain([0, 24])}
            tickValues={[0, 6, 12, 18, 24]}
            tickFormat={(v) => `${v}:00`}
            tickLabelProps={() => ({ fontSize: 10, fill: '#999', textAnchor: 'middle' })}
            stroke="#ddd"
            tickStroke="#ddd"
          />
        </Group>
      </svg>
    </div>
  );
}
