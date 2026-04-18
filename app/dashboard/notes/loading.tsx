import { FileText, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <FileText className="size-4" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-20" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b px-4 py-2 w-full">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="ml-auto h-7 w-24" />
        <Skeleton className="h-7 w-32" />
      </div>

      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}
