import { Button } from "@workspace/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";
import { format, parse } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useState } from "react";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface MonthPickerProps {
  value: string; // "YYYY-MM"
  onChange: (month: string) => void;
  className?: string;
}

export function MonthPicker({ value, onChange, className }: MonthPickerProps) {
  const [year, setYear] = useState(() =>
    value ? Number.parseInt(value.split("-")[0]!, 10) : new Date().getFullYear()
  );

  const selectedYear = value ? Number.parseInt(value.split("-")[0]!, 10) : null;
  const selectedMonth = value
    ? Number.parseInt(value.split("-")[1]!, 10) - 1
    : null;

  const displayLabel = value
    ? format(parse(value, "yyyy-MM", new Date()), "MMM yyyy")
    : null;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            data-empty={!value}
            className={cn(
              "w-36 justify-start text-start font-normal data-[empty=true]:text-muted-foreground",
              className
            )}
          />
        }
      >
        {displayLabel ?? <span>Pick month</span>}
        <CalendarDays className="ms-auto h-4 w-4 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setYear((y) => y - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{year}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setYear((y) => y + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((label, idx) => {
            const isSelected = selectedYear === year && selectedMonth === idx;
            return (
              <Button
                key={label}
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() =>
                  onChange(`${year}-${String(idx + 1).padStart(2, "0")}`)
                }
              >
                {label}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
