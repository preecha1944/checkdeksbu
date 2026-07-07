'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, GraduationCap, AlertTriangle, LogIn, LogOut } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { formatThaiDateOnly, formatTimeOfDay, formatTime } from '@/lib/time';
import { attendanceStatusLabel, attendanceStatusTone } from '@/lib/status';
import type { AttendanceFinalStatus } from '@/types/db';

interface SessionInfo {
  title: string;
  courseName: string | null;
  learningDate: string;
  startTime: string;
  endTime: string;
}

interface RoomOption {
  id: string;
  name: string;
}

interface LookupResult {
  student: { code: string; fullName: string };
  mode: 'checkin' | 'checkout' | 'done';
  rooms?: RoomOption[];
  record?: {
    roomName: string | null;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    finalStatus?: AttendanceFinalStatus | null;
  };
}

interface SuccessInfo {
  type: 'checkin' | 'checkout';
  studentName: string;
  roomName: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  status: AttendanceFinalStatus | 'present' | 'late';
  durationMinutes?: number;
}

type Phase = 'loading' | 'invalid' | 'entry' | 'result' | 'success';

export function ScanFlow() {
  const searchParams = useSearchParams();
  const sid = searchParams.get('sid');
  const token = searchParams.get('t');

  const [phase, setPhase] = useState<Phase>('loading');
  const [invalidMessage, setInvalidMessage] = useState('ลิงก์ไม่ถูกต้อง กรุณาสแกน QR จากหน้าจอในห้องเรียน');
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

  const [studentCode, setStudentCode] = useState('');
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [success, setSuccess] = useState<SuccessInfo | null>(null);

  useEffect(() => {
    if (!sid || !token) {
      setPhase('invalid');
      return;
    }

    (async () => {
      const res = await fetch(`/api/attendance/session-info?sid=${sid}&t=${token}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setInvalidMessage(data?.error ?? 'ไม่สามารถโหลดข้อมูลรอบเรียนได้');
        setPhase('invalid');
        return;
      }
      setSessionInfo(data);
      setPhase('entry');
    })();
  }, [sid, token]);

  function resetToEntry() {
    setStudentCode('');
    setLookup(null);
    setSelectedRoomId(null);
    setEntryError(null);
    setActionError(null);
    setSuccess(null);
    setPhase('entry');
  }

  async function handleLookup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEntryError(null);
    setEntryLoading(true);

    const res = await fetch('/api/attendance/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, token, studentCode }),
    });
    const data = await res.json().catch(() => ({}));
    setEntryLoading(false);

    if (!res.ok) {
      setEntryError(data?.error ?? 'ไม่พบข้อมูล กรุณาลองใหม่');
      return;
    }

    setLookup(data as LookupResult);
    setSelectedRoomId(null);
    setPhase('result');
  }

  async function handleCheckIn() {
    if (!lookup || !selectedRoomId) return;
    setActionError(null);
    setActionLoading(true);

    const res = await fetch('/api/attendance/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, token, studentCode, roomId: selectedRoomId }),
    });
    const data = await res.json().catch(() => ({}));
    setActionLoading(false);

    if (!res.ok) {
      setActionError(data?.error ?? 'Check-in ไม่สำเร็จ กรุณาลองใหม่');
      return;
    }

    setSuccess({
      type: 'checkin',
      studentName: lookup.student.fullName,
      roomName: data.roomName ?? null,
      checkInTime: data.checkInTime,
      status: data.status,
    });
    setPhase('success');
  }

  async function handleCheckOut() {
    if (!lookup) return;
    setActionError(null);
    setActionLoading(true);

    const res = await fetch('/api/attendance/check-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, token, studentCode }),
    });
    const data = await res.json().catch(() => ({}));
    setActionLoading(false);

    if (!res.ok) {
      setActionError(data?.error ?? 'Check-out ไม่สำเร็จ กรุณาลองใหม่');
      return;
    }

    setSuccess({
      type: 'checkout',
      studentName: lookup.student.fullName,
      roomName: lookup.record?.roomName ?? null,
      checkInTime: lookup.record?.checkInTime,
      checkOutTime: data.checkOutTime,
      status: data.finalStatus,
      durationMinutes: data.durationMinutes,
    });
    setPhase('success');
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6">
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-primary p-5 text-center text-white">
        <GraduationCap className="h-8 w-8" aria-hidden="true" />
        {sessionInfo ? (
          <>
            <p className="font-[family-name:var(--font-heading)] text-lg font-semibold">{sessionInfo.title}</p>
            {sessionInfo.courseName && <p className="text-sm text-white/80">{sessionInfo.courseName}</p>}
            <p className="text-sm text-white/80">
              {formatThaiDateOnly(sessionInfo.learningDate)} · {formatTimeOfDay(sessionInfo.startTime)} -{' '}
              {formatTimeOfDay(sessionInfo.endTime)}
            </p>
          </>
        ) : (
          <p className="text-sm text-white/80">สแกน QR เพื่อเข้า/ออกชั่วโมงเรียน</p>
        )}
      </div>

      {phase === 'loading' && (
        <Card className="text-center text-sm text-ink-muted">กำลังโหลดข้อมูล...</Card>
      )}

      {phase === 'invalid' && (
        <Card className="flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="h-10 w-10 text-danger" aria-hidden="true" />
          <p className="text-sm text-ink">{invalidMessage}</p>
        </Card>
      )}

      {phase === 'entry' && (
        <Card>
          <form onSubmit={handleLookup} className="flex flex-col gap-4">
            <Field label="กรอกรหัสนักศึกษา" htmlFor="studentCode" required hint="เช่น 66123456789">
              <Input
                id="studentCode"
                inputMode="numeric"
                autoFocus
                required
                className="h-14 text-center text-lg tracking-wider"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
              />
            </Field>

            {entryError && (
              <div className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
                {entryError}
              </div>
            )}

            <Button type="submit" size="lg" loading={entryLoading} className="w-full">
              ตรวจสอบข้อมูล
            </Button>
          </form>
        </Card>
      )}

      {phase === 'result' && lookup && (
        <Card className="flex flex-col gap-4">
          <div className="rounded-xl bg-primary-soft p-4 text-center">
            <p className="text-xs text-ink-muted">ระบบพบข้อมูลนักศึกษา</p>
            <p className="mt-1 text-sm text-ink-muted">รหัสนักศึกษา {lookup.student.code}</p>
            <p className="font-[family-name:var(--font-heading)] text-lg font-semibold text-ink">
              {lookup.student.fullName}
            </p>
          </div>

          {lookup.mode === 'checkin' && (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-ink">กรุณาเลือกห้องที่เข้าเรียน</p>
                <div className="grid grid-cols-2 gap-3">
                  {(lookup.rooms ?? []).map((room) => {
                    const selected = selectedRoomId === room.id;
                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => setSelectedRoomId(room.id)}
                        className={cn(
                          'flex h-14 cursor-pointer items-center justify-center rounded-xl border text-base font-semibold',
                          'transition-colors duration-150 ease-out',
                          selected
                            ? 'border-primary bg-primary text-white'
                            : 'border-border-soft bg-white text-ink hover:bg-primary-soft'
                        )}
                      >
                        {room.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {actionError && (
                <div className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
                  {actionError}
                </div>
              )}

              <Button
                size="lg"
                className="w-full bg-success hover:bg-green-700"
                disabled={!selectedRoomId}
                loading={actionLoading}
                onClick={handleCheckIn}
              >
                <LogIn className="h-5 w-5" aria-hidden="true" />
                Check-in
              </Button>

              <button
                type="button"
                onClick={resetToEntry}
                className="cursor-pointer text-center text-sm text-ink-muted underline-offset-2 hover:underline"
              >
                ไม่ใช่ฉัน? กรอกรหัสใหม่
              </button>
            </>
          )}

          {lookup.mode === 'checkout' && (
            <>
              <div className="rounded-xl border border-border-soft p-4 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">ห้องเรียน</span>
                  <span className="font-medium text-ink">{lookup.record?.roomName ?? '-'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">เวลา Check-in</span>
                  <span className="font-medium text-ink">{formatTime(lookup.record?.checkInTime)}</span>
                </div>
              </div>

              {actionError && (
                <div className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
                  {actionError}
                </div>
              )}

              <Button
                size="lg"
                variant="danger"
                className="w-full"
                loading={actionLoading}
                onClick={handleCheckOut}
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                Check-out
              </Button>
            </>
          )}

          {lookup.mode === 'done' && (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-border-soft p-4 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">ห้องเรียน</span>
                  <span className="font-medium text-ink">{lookup.record?.roomName ?? '-'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">เวลา Check-in</span>
                  <span className="font-medium text-ink">{formatTime(lookup.record?.checkInTime)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">เวลา Check-out</span>
                  <span className="font-medium text-ink">{formatTime(lookup.record?.checkOutTime)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">สถานะ</span>
                  <Badge tone={attendanceStatusTone(lookup.record?.finalStatus)}>
                    {attendanceStatusLabel(lookup.record?.finalStatus)}
                  </Badge>
                </div>
              </div>
              <p className="text-center text-sm text-ink-muted">คุณเช็คชื่อรอบเรียนนี้ครบแล้ว</p>
            </div>
          )}
        </Card>
      )}

      {phase === 'success' && success && (
        <Card className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="h-14 w-14 text-success" aria-hidden="true" />
          <p className="font-[family-name:var(--font-heading)] text-lg font-semibold text-ink">
            {success.type === 'checkin' ? 'Check-in สำเร็จ' : 'Check-out สำเร็จ'}
          </p>
          <div className="w-full rounded-xl border border-border-soft p-4 text-left text-sm">
            <div className="flex justify-between py-1">
              <span className="text-ink-muted">ชื่อ-สกุล</span>
              <span className="font-medium text-ink">{success.studentName}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-ink-muted">ห้องเรียน</span>
              <span className="font-medium text-ink">{success.roomName ?? '-'}</span>
            </div>
            {success.type === 'checkin' && (
              <div className="flex justify-between py-1">
                <span className="text-ink-muted">เวลา Check-in</span>
                <span className="font-medium text-ink">{formatTime(success.checkInTime)}</span>
              </div>
            )}
            {success.type === 'checkout' && (
              <>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">เวลา Check-out</span>
                  <span className="font-medium text-ink">{formatTime(success.checkOutTime)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">ระยะเวลาเรียน</span>
                  <span className="font-medium text-ink">{success.durationMinutes ?? 0} นาที</span>
                </div>
              </>
            )}
            <div className="flex justify-between py-1">
              <span className="text-ink-muted">สถานะ</span>
              <Badge tone={attendanceStatusTone(success.status as AttendanceFinalStatus)}>
                {attendanceStatusLabel(success.status as AttendanceFinalStatus)}
              </Badge>
            </div>
          </div>

          <button
            type="button"
            onClick={resetToEntry}
            className="cursor-pointer text-sm text-primary underline-offset-2 hover:underline"
          >
            เสร็จสิ้น (ให้คนถัดไปเช็คชื่อ)
          </button>
        </Card>
      )}
    </div>
  );
}
