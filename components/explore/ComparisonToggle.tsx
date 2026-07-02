'use client';

export function ComparisonToggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-neutral-600">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-neutral-300"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      Compare against a second profile
    </label>
  );
}
