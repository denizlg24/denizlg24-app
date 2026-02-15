import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderPlus, MoveLeft } from "lucide-react";

export default function Loading() {
  return (
    <div className="w-full flex flex-col gap-4 px-4 py-2">
      <div className="flex flex-row items-center gap-1">
        <Button variant="outline" size="icon">
          <MoveLeft />
        </Button>

        <Breadcrumb className="h-9 border border-border w-full px-3 py-1 rounded-md flex items-center">
          <BreadcrumbList className="text-sm">
            <BreadcrumbList>
              <BreadcrumbLink>home</BreadcrumbLink>
            </BreadcrumbList>
          </BreadcrumbList>
        </Breadcrumb>

        <Select>
          <SelectTrigger className="w-40 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nameAsc">Name A-Z</SelectItem>
            <SelectItem value="nameDesc">Name Z-A</SelectItem>
            <SelectItem value="dateDesc">Recent First</SelectItem>
            <SelectItem value="dateAsc">Oldest first</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon">
          <FolderPlus />
        </Button>
      </div>
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
