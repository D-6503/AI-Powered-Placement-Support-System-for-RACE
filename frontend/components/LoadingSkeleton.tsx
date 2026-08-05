"use client";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-orange-100/50 rounded-xl ${className}`} />
  );
}

export default function LoadingSkeleton({ type = "dashboard" }: { type?: "dashboard" | "list" | "card" }) {
  if (type === "card") {
    return (
      <div className="p-6 bg-card-cream border border-orange-100 rounded-3xl space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (type === "list") {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 bg-card-cream border border-orange-100 rounded-3xl flex justify-between items-center gap-6">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-4 gap-6">
        <Skeleton className="h-32 md:col-span-2 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        <Skeleton className="h-96 md:col-span-2 rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    </div>
  );
}
