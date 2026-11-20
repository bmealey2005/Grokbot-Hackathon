import { cx } from "./cx";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton rounded-lg", className)} />;
}

export function QuestionSkeleton() {
  return (
    <div className="mt-10" aria-hidden="true">
      <Skeleton className="h-8 w-40 rounded-full" />
      <Skeleton className="mt-8 h-9 w-11/12" />
      <Skeleton className="mt-3 h-9 w-2/3" />
      <div className="mt-8 space-y-3">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function ResultsSkeleton() {
  return (
    <div className="mt-10" aria-hidden="true">
      <Skeleton className="h-10 w-2/3" />
      <div className="mt-8 grid grid-cols-3 gap-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
