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
    } catch {
      setError('เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต');
    } finally {
      fetchingRef.current = false;
    }
  }, [session.id]);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${session.id}/live`);
      if (!res.ok) return;
      const data: LiveResponse = await res.json();
      setLive(data);
    } catch {
      // เงียบไว้ — ไม่ต้อง block หน้าจอ QR เพราะ live count ล้มเหลวชั่วคราว
    }
  }, [session.id]);

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

  return (
    <div className="grid min-h-screen grid-cols-1 gap-6 bg-app-bg p-6 lg:grid-cols-2">
      <Card className="flex flex-col items-center justify-center gap-6 p-10">
        <div className="flex items-center gap-2 text-ink-muted">
          <QrCode className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-medium">สแกน QR เพื่อเข้า/ออกชั่วโมงเรียน</span>
        </div>

        <div className="flex h-80 w-80 items-center justify-center rounded-2xl border border-border-soft bg-white p-4">
          {scanUrl ? (
            <QRCodeSVG value={scanUrl} size={288} level="M" />
          ) : (
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
          )}
        </div>

        <div className="w-full max-w-xs">
          <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-neutral-soft">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-center text-sm text-ink-muted">
            QR จะเปลี่ยนใน {mm}:{ss}
          </p>
        </div>

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

function LiveStat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-xl bg-primary-soft p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="font-[family-name:var(--font-heading)] text-2xl font-bold text-primary-deep">
        {value ?? '-'}
      </p>
    </div>
  );
}
