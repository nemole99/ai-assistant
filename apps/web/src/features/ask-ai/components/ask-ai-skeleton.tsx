import { Skeleton } from "@workspace/ui/components/skeleton";

export function AskAiSkeleton() {
  return (
    <div className="relative flex size-full flex-col overflow-hidden">
      {/* Header skeleton */}
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* Messages skeleton */}
      <div className="flex flex-1 justify-center overflow-hidden">
        <div className="flex w-full max-w-3xl flex-col gap-6 p-6">
          {/* Assistant message */}
          <div className="flex gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          {/* User message */}
          <div className="flex justify-end gap-3">
            <div className="max-w-[70%] space-y-2">
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          {/* Assistant message */}
          <div className="flex gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        </div>
      </div>

      {/* Input area skeleton */}
      <div className="flex shrink-0 justify-center px-4 pb-4 pt-2">
        <div className="w-full max-w-3xl space-y-3">
          {/* Suggestion skeleton */}
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-40 rounded-full" />
            <Skeleton className="h-8 w-52 rounded-full" />
            <Skeleton className="h-8 w-36 rounded-full" />
            <Skeleton className="h-8 w-48 rounded-full" />
          </div>
          {/* Input box skeleton */}
          <Skeleton className="h-30 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
