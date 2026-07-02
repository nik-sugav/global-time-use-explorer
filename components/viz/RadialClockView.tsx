'use client';

import { useMemo, useState } from 'react';
import { arc as d3arc } from 'd3-shape';
import { motion } from 'framer-motion';
import type { DayProfile, TimeSlot } from '@/lib/types';
import { CATEGORY_META } from '@/lib/taxonomy';

const SIZE = 340;
const CENTER = SIZE / 2;
const OUTER_R = SIZE / 2 - 8;
const INNER_R = OUTER_R * 0.42;
const SLOT_ANGLE = (2 * Math.PI) / 96;

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

function slotToAngle(slot: number): number {
  // slot 0 (00:00) at top, clockwise
  return slot * SLOT_ANGLE - Math.PI / 2;
}

function formatHour(slot: number): string {
  const totalMinutes = slot * 15;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function RadialClockView({ profile, playing }: { profile: DayProfile | null; playing: boolean }) {
  const [hovered, setHovered] = useState<Segment | null>(null);

  const segments = useMemo(() => (profile ? mergeSlotsIntoSegments(profile.slots) : []), [profile]);

  const arcGenerator = d3arc<{ startAngle: number; endAngle: number }>()
    .innerRadius(INNER_R)
    .outerRadius(OUTER_R)
    .padAngle(0.004)
    .cornerRadius(1);

  if (!profile) {
    return (
      <div
        className="mx-auto flex aspect-square w-full items-center justify-center text-sm text-neutral-400"
        style={{ maxWidth: SIZE }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full" style={{ maxWidth: SIZE }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <g transform={`translate(${CENTER}, ${CENTER})`}>
          {segments.map((seg, i) => {
            const path = arcGenerator({
              startAngle: slotToAngle(seg.startSlot) + Math.PI / 2,
              endAngle: slotToAngle(seg.endSlot) + Math.PI / 2,
            });
            const meta = CATEGORY_META[seg.category];
            const isHovered = hovered === seg;
            return (
              <path
                key={i}
                d={path ?? undefined}
                fill={meta.color}
                opacity={seg.quality === 'estimated' ? 0.68 : 1}
                stroke={isHovered ? '#111' : 'none'}
                strokeWidth={isHovered ? 1.5 : 0}
                onMouseEnter={() => setHovered(seg)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer', transition: 'opacity 120ms' }}
              />
            );
          })}
          {/* hour tick marks at 0/6/12/18 */}
          {[0, 24, 48, 72].map((slot) => {
            const angle = slotToAngle(slot);
            const x1 = Math.cos(angle) * (OUTER_R + 4);
            const y1 = Math.sin(angle) * (OUTER_R + 4);
            return (
              <text key={slot} x={x1} y={y1} fontSize={11} fill="#888" textAnchor="middle" dominantBaseline="middle">
                {formatHour(slot)}
              </text>
            );
          })}
          {playing && (
            <motion.line
              x1={0}
              y1={0}
              x2={0}
              y2={-OUTER_R}
              stroke="#111"
              strokeWidth={1.5}
              strokeDasharray="2 3"
              initial={{ rotate: -90 }}
              animate={{ rotate: 270 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              style={{ transformOrigin: '0px 0px' }}
            />
          )}
          <circle r={INNER_R - 2} fill="white" />
          <text textAnchor="middle" dy={-4} fontSize={13} fill="#333" fontWeight={600}>
            {hovered ? CATEGORY_META[hovered.category].label : '24-hour day'}
          </text>
          <text textAnchor="middle" dy={14} fontSize={11} fill="#888">
            {hovered ? `${formatHour(hovered.startSlot)}–${formatHour(hovered.endSlot)}` : `Tier ${profile.tier} data`}
          </text>
        </g>
      </svg>
    </div>
  );
}
