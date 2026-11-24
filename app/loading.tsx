import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <p role="status" className="sr-only">
        Loading page
      </p>
      <div
        aria-hidden="true"
        className="mx-auto w-full max-w-4xl px-5 pt-14 pb-20 sm:px-6 sm:pt-20"
      >
        <Skeleton className="h-11 w-44 motion-reduce:animate-none" />
        <Skeleton className="mt-4 h-4 w-80 max-w-full motion-reduce:animate-none" />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Skeleton className="h-32 rounded-lg motion-reduce:animate-none" />
          <Skeleton className="h-32 rounded-lg motion-reduce:animate-none" />
          <Skeleton className="h-32 rounded-lg motion-reduce:animate-none" />
          <Skeleton className="h-32 rounded-lg motion-reduce:animate-none" />
          <Skeleton className="h-32 rounded-lg motion-reduce:animate-none" />
          <Skeleton className="h-32 rounded-lg motion-reduce:animate-none" />
        </div>
      </div>
    </>
  );
}
