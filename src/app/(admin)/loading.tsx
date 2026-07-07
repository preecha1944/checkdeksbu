function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-neutral-soft ${className}`} />;
}

export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <SkeletonBlock className="h-8 w-48" />
          <SkeletonBlock className="mt-2 h-4 w-72 max-w-full" />
        </div>
        <SkeletonBlock className="h-10 w-36" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border-soft bg-card p-5 shadow-[0_12px_34px_rgba(64,32,118,0.08)]">
            <SkeletonBlock className="h-9 w-9" />
            <SkeletonBlock className="mt-4 h-4 w-24" />
            <SkeletonBlock className="mt-3 h-8 w-16" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border-soft bg-card p-5 shadow-[0_12px_34px_rgba(64,32,118,0.08)]">
        <SkeletonBlock className="h-6 w-44" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-11 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
