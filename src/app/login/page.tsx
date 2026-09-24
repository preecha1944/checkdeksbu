'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, Eye, EyeOff, FileSpreadsheet, GraduationCap, LayoutGrid, QrCode } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { QR_GRACE_SECONDS, QR_ROTATE_SECONDS } from '@/lib/constants';

// ตัวเลขบนแผงซ้ายเป็นข้อเท็จจริงของระบบ ไม่ใช่ตัวเลขการตลาดที่ตั้งขึ้นเอง
// สองตัวแรกอ่านจาก lib/constants โดยตรง ส่วน "3 รูปแบบ" นับจากจำนวน route ใต้ api/export
// และหน้านี้เปิดสาธารณะ (ยังไม่ login) จึงตั้งใจไม่ดึงยอดนักศึกษา/รายวิชาจาก DB มาแสดง
const FEATURES = [
  { icon: QrCode, title: 'เช็คชื่อด้วย QR', detail: 'สแกนเข้า–ออกเองจากมือถือ บันทึกเวลาอัตโนมัติ' },
  { icon: Calculator, title: 'ตัดเกรดอัตโนมัติ', detail: 'รวมคะแนนทุกหมวดแล้วเทียบเกณฑ์เกรดให้ทันที' },
  { icon: LayoutGrid, title: 'จัดการ Section เอง', detail: 'เพิ่ม เปลี่ยนชื่อ หรือลบ Section ได้จากหน้า Settings' },
  { icon: FileSpreadsheet, title: 'ออกรายงาน Excel', detail: 'ดาวน์โหลดได้ทั้งรายนักศึกษา รายรอบเรียน และรายวิชา' },
];

const FACTS = [
  { value: String(QR_ROTATE_SECONDS / 60), unit: 'นาที', label: 'QR เปลี่ยนรหัสใหม่' },
  { value: String(QR_GRACE_SECONDS), unit: 'วินาที', label: 'ผ่อนผันตอนสแกน' },
  { value: '3', unit: 'รูปแบบ', label: 'ไฟล์ Excel ที่ออกได้' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      {/* ---------- ฝั่งซ้าย: แบรนด์และจุดเด่นของระบบ (ซ่อนบนจอเล็ก) ---------- */}
      <section className="relative hidden overflow-hidden bg-[linear-gradient(145deg,var(--color-primary-deep)_0%,var(--color-primary-dark)_52%,var(--color-primary)_100%)] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        {/* วงกลมเบลอประดับ — static ไม่มี animation จะได้ไม่กินเฟรมตอนโหลด */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-white/[0.07] blur-3xl"
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <GraduationCap className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <p className="font-[family-name:var(--font-heading)] text-base font-semibold leading-tight">
                ระบบเช็คชื่อและตัดเกรดนักศึกษา
              </p>
              <p className="text-xs text-white/60">Student Attendance &amp; Grade Management</p>
            </div>
          </div>

          <h2 className="mt-10 max-w-md font-[family-name:var(--font-heading)] text-3xl font-bold leading-snug xl:text-4xl">
            เช็คชื่อด้วย QR
            <br />
            ตัดเกรดอัตโนมัติ
            <br />
            <span className="text-white/70">จบในระบบเดียว</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
            ตั้งแต่เปิดรอบเรียน ฉาย QR ให้นักศึกษาสแกน ไปจนถึงรวมคะแนนและส่งออกเกรด
            ทำต่อเนื่องได้ในที่เดียว ไม่ต้องย้ายข้อมูลไปมาระหว่างไฟล์
          </p>
        </div>

        <LoginIllustration />

        <div className="relative">
          <ul className="anim-stagger grid max-w-xl grid-cols-1 gap-x-8 gap-y-4 xl:grid-cols-2">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="anim-fade-up flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <feature.icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{feature.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/60">{feature.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 border-t border-white/15 pt-6">
            {FACTS.map((fact) => (
              <div key={fact.label}>
                <p className="font-[family-name:var(--font-heading)] text-2xl font-bold leading-none">
                  {fact.value}
                  <span className="ml-1 text-sm font-medium text-white/60">{fact.unit}</span>
                </p>
                <p className="mt-1.5 text-xs leading-snug text-white/60">{fact.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- ฝั่งขวา: ฟอร์มเข้าสู่ระบบ ---------- */}
      <section className="flex items-center justify-center px-5 py-12 sm:px-8 lg:sticky lg:top-0 lg:h-dvh lg:self-start">
        <div className="anim-fade-up w-full max-w-sm">
          {/* บนมือถือแผงซ้ายถูกซ่อน จึงยกโลโก้ย่อมาไว้เหนือฟอร์มแทน แบรนด์จะได้ไม่หายไป */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
              <GraduationCap className="h-8 w-8" aria-hidden="true" />
            </div>
            <p className="font-[family-name:var(--font-heading)] text-base font-semibold text-ink">
              ระบบเช็คชื่อและตัดเกรดนักศึกษา
            </p>
          </div>

          <div className="mb-7">
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-ink">เข้าสู่ระบบ</h1>
            <p className="mt-1.5 text-sm text-ink-muted">สำหรับผู้ดูแลระบบและอาจารย์ผู้สอน</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="อีเมล" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>

            <Field label="รหัสผ่าน" htmlFor="password" required>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-neutral-soft"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </Field>

            {error && (
              <div className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
              เข้าสู่ระบบ
            </Button>
          </form>

          <p className="mt-8 text-center text-xs leading-relaxed text-ink-muted">
            บัญชีผู้ใช้ออกให้โดยผู้ดูแลระบบ หากเข้าใช้งานไม่ได้ กรุณาติดต่อผู้ดูแลระบบของหลักสูตร
          </p>
        </div>
      </section>
    </div>
  );
}

/** ภาพประกอบแผงซ้าย — วาดด้วย SVG inline ทั้งหมด ไม่พึ่งไฟล์ภาพหรือ CDN ภายนอก */
function LoginIllustration() {
  return (
    // gate ตามความสูงจอ ไม่ใช่ความกว้าง เพราะปัญหาคือเนื้อหาฝั่งซ้ายสูงเกินจอ
    <div className="relative my-8 hidden [@media(min-height:900px)]:block" aria-hidden="true">
      <svg viewBox="0 0 320 172" className="h-auto w-full max-w-sm" fill="none">
        {/* การ์ดฉาย QR */}
        <rect x="8" y="14" width="132" height="146" rx="16" fill="white" fillOpacity="0.1" />
        <rect x="8.5" y="14.5" width="131" height="145" rx="15.5" stroke="white" strokeOpacity="0.25" />
        <rect x="32" y="38" width="84" height="84" rx="8" fill="white" fillOpacity="0.92" />

        {/* บล็อก QR แบบย่อ */}
        <g fill="var(--color-primary-deep)">
          <rect x="42" y="48" width="20" height="20" rx="4" />
          <rect x="86" y="48" width="20" height="20" rx="4" />
          <rect x="42" y="92" width="20" height="20" rx="4" />
          <rect x="70" y="60" width="8" height="8" rx="2" />
          <rect x="70" y="76" width="8" height="8" rx="2" />
          <rect x="86" y="76" width="8" height="8" rx="2" />
          <rect x="70" y="92" width="8" height="8" rx="2" />
          <rect x="86" y="104" width="8" height="8" rx="2" />
          <rect x="98" y="92" width="8" height="8" rx="2" />
        </g>
        <g fill="white">
          <rect x="48" y="54" width="8" height="8" rx="2" />
          <rect x="92" y="54" width="8" height="8" rx="2" />
          <rect x="48" y="98" width="8" height="8" rx="2" />
        </g>

        {/* มุมกรอบสแกน */}
        <g stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <path d="M26 46v-8a6 6 0 016-6h8" />
          <path d="M122 46v-8a6 6 0 00-6-6h-8" />
          <path d="M26 114v8a6 6 0 006 6h8" />
          <path d="M122 114v8a6 6 0 01-6 6h-8" />
        </g>
        <rect x="32" y="136" width="56" height="7" rx="3.5" fill="white" fillOpacity="0.35" />

        {/* การ์ดสรุปเกรด */}
        <rect x="156" y="14" width="156" height="146" rx="16" fill="white" fillOpacity="0.1" />
        <rect x="156.5" y="14.5" width="155" height="145" rx="15.5" stroke="white" strokeOpacity="0.25" />
        <rect x="174" y="34" width="62" height="7" rx="3.5" fill="white" fillOpacity="0.5" />

        {/* แถวคะแนนพร้อมป้ายเกรด */}
        <rect x="174" y="54" width="82" height="6" rx="3" fill="white" fillOpacity="0.3" />
        <rect x="266" y="49" width="28" height="16" rx="8" fill="white" fillOpacity="0.9" />
        <text x="280" y="61" textAnchor="middle" fill="var(--color-primary-deep)" fontSize="10" fontWeight="700">
          A
        </text>

        <rect x="174" y="80" width="68" height="6" rx="3" fill="white" fillOpacity="0.3" />
        <rect x="266" y="75" width="28" height="16" rx="8" fill="white" fillOpacity="0.65" />
        <text x="280" y="87" textAnchor="middle" fill="var(--color-primary-deep)" fontSize="10" fontWeight="700">
          B+
        </text>

        <rect x="174" y="106" width="76" height="6" rx="3" fill="white" fillOpacity="0.3" />
        <rect x="266" y="101" width="28" height="16" rx="8" fill="white" fillOpacity="0.45" />
        <text x="280" y="113" textAnchor="middle" fill="var(--color-primary-deep)" fontSize="10" fontWeight="700">
          B
        </text>

        {/* กราฟแนวโน้มย่อ */}
        <path
          d="M174 142l22-12 22 7 22-18 22 9 32-16"
          stroke="white"
          strokeOpacity="0.55"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
