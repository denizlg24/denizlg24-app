import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Notes</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Group notes into folders to keep things organized.
        </p>
      </div>
      <Separator className="my-1 w-full" />
      <div className="flex flex-row items-center justify-between gap-2">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-8 w-24 rounded" />
        <Skeleton className="h-8 w-24 rounded" />
      </div>
      <Skeleton className="h-4 w-12 rounded" />
      <div className="w-full flex flex-col gap-0">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index}>
            <div className="w-full relative pl-3">
              <div className="flex flex-row items-center gap-1">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
                <div className="grow" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            </div>
            <Separator className="my-1 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
