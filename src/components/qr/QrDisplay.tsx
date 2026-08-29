'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, StopCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatThaiDateOnly, formatTimeOfDay } from '@/lib/time';
import { QR_ROTATE_SECONDS } from '@/lib/constants';

export interface QrDisplaySession {
  id: string;
  title: string;
  courseName: string | null;
  learningDate: string;
  startTime: string;
  endTime: string;
}

interface QrTokenResponse {
  token: string;
  scanUrl: string;
  secondsLeft: number;
}

interface LiveResponse {
  totalStudents: number;
  status: string;
  checkedIn: number;
  checkedOut: number;
  late: number;
  notCome: number;
  byRoom: { roomId: string; roomName: string; checkedIn: number; checkedOut: number }[];
}

export function QrDisplay({ session }: { session: QrDisplaySession }) {
  const router = useRouter();
  const [scanUrl, setScanUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(QR_ROTATE_SECONDS);
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const fetchingRef = useRef(false);
  // เพิ่มขึ้นทุกครั้งที่ได้โทเคนใหม่ ใช้เป็น key สองที่:
  //   QR — ถอด/ใส่ใหม่เพื่อให้ animation สลับเล่นซ้ำได้
  //   วงแหวน — ถอด/ใส่ใหม่เพื่อฆ่า CSS transition ไม่ให้เส้นวิ่งย้อนกลับตอนนับใหม่จาก 0 เป็น 180
  const [tokenKey, setTokenKey] = useState(0);

  const fetchToken = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch(`/api/sessions/${session.id}/qr-token`);
      const data: QrTokenResponse & { error?: string } = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'ไม่สามารถโหลด QR Code ได้');
        return;
      }
      setError(null);
      setScanUrl(data.scanUrl);
      setSecondsLeft(data.secondsLeft);
      setTokenKey((n) => n + 1);
    } catch {
      setError('เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต');
    } finally {
      fetchingRef.current = false;
    }
  }, [session.id]);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${session.id}/live`);
      if (!res.ok) {
        if (res.status === 404) router.push('/sessions');
        return;
      }
      const data: LiveResponse = await res.json();
      if (data.status !== 'open') {
        router.push(`/sessions/${session.id}`);
        return;
      }
      setLive(data);
    } catch {
      // เงียบไว้ — ไม่ต้อง block หน้าจอ QR เพราะ live count ล้มเหลวชั่วคราว
    }
  }, [router, session.id]);

  useEffect(() => {
    fetchToken();
    fetchLive();
    const liveInterval = setInterval(fetchLive, 5000);
    return () => clearInterval(liveInterval);
  }, [fetchToken, fetchLive]);

  useEffect(() => {
    const countdown = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          fetchToken();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdown);
  }, [fetchToken]);

  async function handleClose() {
    setClosing(true);
    const res = await fetch(`/api/sessions/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed' }),
    });
    setClosing(false);
    if (res.ok) {
      router.push(`/sessions/${session.id}`);
    } else {
      setConfirmClose(false);
      setError('ปิดรอบเรียนไม่สำเร็จ กรุณาลองใหม่');
    }
  }

  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const ss = (secondsLeft % 60).toString().padStart(2, '0');
  const progressPct = Math.max(0, Math.min(100, (secondsLeft / QR_ROTATE_SECONDS) * 100));

  // วงแหวนนับถอยหลังล้อมรอบ QR แทนแถบเส้นตรงเดิม — จากท้ายห้องเส้นโค้งรอบ QR อ่านง่ายกว่าแถบ 8px
  // ขยับด้วย stroke-dashoffset วินาทีละครั้ง ไม่ต้องใช้ requestAnimationFrame
  const RING_R = 46;
  const RING_C = 2 * Math.PI * RING_R;
  const ringOffset = RING_C * (1 - progressPct / 100);
  const nearlyExpired = secondsLeft <= 10 && secondsLeft > 0;

  return (
    <div className="grid min-h-screen grid-cols-1 gap-6 bg-app-bg p-6 lg:grid-cols-2">
      <Card className="flex flex-col items-center justify-center gap-6 p-10">
        <div className="flex items-center gap-2 text-ink-muted">
          <QrCode className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-medium">สแกน QR เพื่อเข้า/ออกชั่วโมงเรียน</span>
        </div>

        <div className="relative grid h-96 w-96 place-items-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r={RING_R} fill="none" strokeWidth="3" className="stroke-border-soft" />
            <circle
              key={tokenKey}
              cx="50"
              cy="50"
              r={RING_R}
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={ringOffset}
              className={
                nearlyExpired
                  ? 'stroke-warning transition-[stroke-dashoffset,stroke] duration-1000 ease-linear'
                  : 'stroke-primary transition-[stroke-dashoffset,stroke] duration-1000 ease-linear'
              }
            />
          </svg>

          <div
            className={`flex h-72 w-72 items-center justify-center rounded-2xl border border-border-soft bg-white p-4 ${
              nearlyExpired ? 'anim-breathe' : ''
            }`}
          >
            {scanUrl ? (
              // key={tokenKey} ทำให้ QR ถูกถอด/ใส่ใหม่ทุกรอบโทเคน animation จางผ่านจึงเล่นซ้ำได้
              <div key={tokenKey} className="anim-qr-swap">
                <QRCodeSVG value={scanUrl} size={256} level="M" />
              </div>
            ) : (
              <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
            )}
          </div>
        </div>

        <p
          className={`text-center text-sm ${nearlyExpired ? 'font-medium text-warning' : 'text-ink-muted'}`}
          role="status"
          aria-live="off"
        >
          {secondsLeft === 0 ? 'กำลังโหลดโค้ดใหม่...' : `QR จะเปลี่ยนใน ${mm}:${ss}`}
        </p>

        {error && <p className="text-sm text-danger">{error}</p>}
      </Card>

      <div className="flex flex-col gap-6">
        <Card>
          <p className="font-[family-name:var(--font-heading)] text-lg font-semibold text-ink">{session.title}</p>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-ink-muted">รายวิชา</dt>
              <dd className="font-medium text-ink">{session.courseName ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">วันที่</dt>
              <dd className="font-medium text-ink">{formatThaiDateOnly(session.learningDate)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">เวลาเรียน</dt>
              <dd className="font-medium text-ink">
                {formatTimeOfDay(session.startTime)} - {formatTimeOfDay(session.endTime)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="grid grid-cols-2 gap-4">
          <LiveStat label="Check-in แล้ว" value={live?.checkedIn} />
          <LiveStat label="Check-out แล้ว" value={live?.checkedOut} />
          {(live?.byRoom ?? []).map((room) => (
            <LiveStat key={room.roomId} label={room.roomName} value={room.checkedIn} />
          ))}
        </Card>

        <Button variant="danger" size="lg" onClick={() => setConfirmClose(true)}>
          <StopCircle className="h-5 w-5" aria-hidden="true" />
          ปิดรอบเรียน
        </Button>
      </div>

      <Modal open={confirmClose} onClose={() => setConfirmClose(false)} title="ยืนยันปิดรอบเรียน">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            เมื่อปิดรอบเรียนแล้ว QR Code จะใช้งานไม่ได้ทันที ไม่สามารถย้อนกลับได้
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setConfirmClose(false)}>
              ยกเลิก
            </Button>
            <Button type="button" variant="danger" loading={closing} onClick={handleClose}>
              ยืนยันปิดรอบเรียน
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ตัวเลข live ดึงใหม่ทุก 5 วินาทีแล้วเปลี่ยนค่าเงียบ ๆ อาจารย์ที่ไม่ได้จ้องจอจะไม่รู้ว่ามีใครเข้ามาเพิ่ม
// ให้เลขไต่ขึ้นแทนการกระโดด แล้วการ์ดวาบเขียวจาง ๆ ตอนค่าขยับ — เห็นจากหางตาได้ว่าห้องกำลังเดิน
function LiveStat({ label, value }: { label: string; value: number | undefined }) {
  const target = value ?? null;
  // เริ่มที่ 0 เสมอ ครั้งแรกที่โหลดจึงเห็นเลขไต่ขึ้นจากศูนย์ ครั้งต่อไปไต่ต่อจากเลขเดิม ไม่รีเซ็ต
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    if (target === null) return;
    const from = shownRef.current;
    if (from === target) return;

    // reduced-motion: ให้ระยะสั้นที่สุด เฟรมแรกก็กระโดดถึงค่าปลายเลย
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 500;
    const start = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const next = Math.round(from + (target - from) * eased);
      shownRef.current = next;
      setShown(next);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    // key={target} ทำให้การ์ดถูกถอด/ใส่ใหม่ทุกครั้งที่ค่าขยับ animation วาบจึงเล่นซ้ำได้โดยไม่ต้องเก็บ state
    <div key={target ?? 'none'} className="anim-stat-flash rounded-xl bg-primary-soft p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="font-[family-name:var(--font-heading)] text-2xl font-bold tabular-nums text-primary-deep">
        {target === null ? '-' : shown}
      </p>
    </div>
  );
}
