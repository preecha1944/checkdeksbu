function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/25 ${className}`} />;
}

export default function ScanLoading() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6" aria-busy="true" aria-live="polite">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-primary p-5">
        <SkeletonBlock className="h-8 w-8 rounded-full" />
        <SkeletonBlock className="h-5 w-52" />
        <SkeletonBlock className="h-4 w-64 max-w-full" />
      </div>

      <div className="rounded-2xl border border-border-soft bg-card p-5 shadow-[0_12px_34px_rgba(64,32,118,0.08)]">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 rounded-xl bg-neutral-soft" />
          <div className="h-14 w-full rounded-xl bg-neutral-soft" />
          <div className="h-12 w-full rounded-xl bg-neutral-soft" />
        </div>
      </div>
    </div>
  );
}
