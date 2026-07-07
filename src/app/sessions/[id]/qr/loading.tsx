function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-neutral-soft ${className}`} />;
}

export default function QrLoading() {
  return (
    <div className="grid min-h-screen grid-cols-1 gap-6 bg-app-bg p-6 lg:grid-cols-2" aria-busy="true" aria-live="polite">
      <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-border-soft bg-card p-10 shadow-[0_12px_34px_rgba(64,32,118,0.08)]">
        <SkeletonBlock className="h-5 w-64 max-w-full" />
        <SkeletonBlock className="h-80 w-80 max-w-full" />
        <SkeletonBlock className="h-2 w-80 max-w-full rounded-full" />
      </div>

      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-border-soft bg-card p-5 shadow-[0_12px_34px_rgba(64,32,118,0.08)]">
          <SkeletonBlock className="h-6 w-56" />
          <SkeletonBlock className="mt-4 h-4 w-72 max-w-full" />
          <SkeletonBlock className="mt-4 h-4 w-44" />
        </div>
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border-soft bg-card p-5 shadow-[0_12px_34px_rgba(64,32,118,0.08)]">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-20" />
          ))}
        </div>
        <SkeletonBlock className="h-12 w-full" />
      </div>
    </div>
  );
}
