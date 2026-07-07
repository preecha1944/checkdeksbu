import { Suspense } from 'react';
import { ScanFlow } from '@/components/scan/ScanFlow';

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-app-bg" />}>
      <ScanFlow />
    </Suspense>
  );
}
