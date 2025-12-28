import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="bg-background" role="status" aria-busy="true">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-start gap-6">
          <div>
            <Skeleton className="h-48 w-48 rounded-md" />
          </div>

          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Skeleton className="h-10 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
