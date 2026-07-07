'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Home } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export interface RoomDistributionPoint {
  name: string;
  value: number;
}

const COLORS = ['#6d28d9', '#c4b5fd', '#22c55e', '#f59e0b'];

export function RoomDistributionChart({ data }: { data: RoomDistributionPoint[] }) {
  if (data.length === 0) {
    return <EmptyState icon={Home} title="ยังไม่มีข้อมูลห้องเรียน" description="สัดส่วนจะแสดงเมื่อมีนักศึกษาเช็คชื่อเข้าห้อง" />;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="relative h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2} strokeWidth={0}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [`${value} คน`, name]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="font-[family-name:var(--font-heading)] text-2xl font-bold text-ink">{total}</p>
          <p className="text-xs font-semibold text-ink-muted">Total</p>
        </div>
      </div>
      <div className="mt-1 flex flex-wrap justify-center gap-3 text-xs text-ink-muted">
        {data.map((entry, index) => (
          <span key={entry.name} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            {entry.name} {entry.value} คน
          </span>
        ))}
      </div>
    </div>
  );
}
