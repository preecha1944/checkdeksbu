'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export interface AttendanceTrendPoint {
  label: string;
  percent: number;
}

export function AttendanceTrendChart({ data }: { data: AttendanceTrendPoint[] }) {
  if (data.length === 0) {
    return <EmptyState icon={TrendingUp} title="ยังไม่มีรอบเรียนที่ปิดแล้ว" description="กราฟจะแสดงเมื่อมีการปิดรอบเรียน" />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 14, bottom: 0, left: -14 }}>
        <CartesianGrid stroke="#efe7fb" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b607e' }} axisLine={false} tickLine={false} />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12, fill: '#6b607e' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip formatter={(value) => [`${value}%`, 'อัตราเข้าเรียน']} />
        <Line
          type="monotone"
          dataKey="percent"
          stroke="#6d28d9"
          strokeWidth={3}
          dot={{ r: 4, fill: '#6d28d9', strokeWidth: 0 }}
          activeDot={{ r: 6, stroke: '#ede9fe', strokeWidth: 4 }}
          animationEasing="ease-out"
          animationDuration={300}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
