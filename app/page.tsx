import { Suspense } from 'react';
import { ExploreClient } from '@/components/explore/ExploreClient';

export default function Home() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-neutral-400">Loading…</div>}>
      <ExploreClient />
    </Suspense>
  );
}
