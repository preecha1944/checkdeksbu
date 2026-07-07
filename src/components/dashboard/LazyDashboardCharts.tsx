'use client';

import dynamic from 'next/dynamic';
import type { AttendanceTrendPoint } from '@/components/dashboard/AttendanceTrendChart';
import type { RoomDistributionPoint } from '@/components/dashboard/RoomDistributionChart';

function ChartLoading() {
  return <div className="h-64 animate-pulse rounded-xl bg-neutral-soft" aria-label="กำลังโหลดกราฟ" />;
}

const LazyAttendanceTrend = dynamic(
  () => import('@/components/dashboard/AttendanceTrendChart').then((mod) => mod.AttendanceTrendChart),
  { loading: ChartLoading }
);

const LazyRoomDistribution = dynamic(
  () => import('@/components/dashboard/RoomDistributionChart').then((mod) => mod.RoomDistributionChart),
  { loading: ChartLoading }
);

export function LazyAttendanceTrendChart({ data }: { data: AttendanceTrendPoint[] }) {
  return <LazyAttendanceTrend data={data} />;
}

export function LazyRoomDistributionChart({ data }: { data: RoomDistributionPoint[] }) {
  return <LazyRoomDistribution data={data} />;
}
