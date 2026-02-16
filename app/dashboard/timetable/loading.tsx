import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimetableGrid } from "@/app/dashboard/timetable/_components/timetable-grid";

export default function Loading() {
  return (
    <div className="flex flex-col gap-2 px-2 pb-2">
      <TimetableGrid entries={[]}  />
      <Button className="w-full">
        <Plus className="size-4" />
        Add Entry
      </Button>
    </div>
  );
}
