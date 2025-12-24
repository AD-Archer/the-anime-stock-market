import { Skeleton } from "@/components/ui/skeleton";

export function PageShellLoading({
  titleWidth = "w-56",
  subtitleWidth = "w-80",
}: {
  titleWidth?: string;
  subtitleWidth?: string;
}) {
  return (
    <div className="bg-background" role="status" aria-busy="true" aria-live="polite">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 space-y-3">
          <Skeleton className={`h-10 ${titleWidth}`} />
          <Skeleton className={`h-4 ${subtitleWidth}`} />
        </div>

        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div key={idx} className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-md" />
                </div>

                <div className="mt-6 space-y-3">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
