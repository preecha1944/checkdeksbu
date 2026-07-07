import { LayoutDashboard } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="แดชบอร์ด"
        description="ภาพรวมการเช็คชื่อและสถิติการเข้าเรียน"
      />
      <EmptyState
        icon={LayoutDashboard}
        title="ยังไม่มีข้อมูลสรุป"
        description="แดชบอร์ดฉบับเต็มพร้อมกราฟและสถิติจะพร้อมใช้งานเมื่อมีการสร้างรอบเรียนและเช็คชื่อ"
      />
    </div>
  );
}
