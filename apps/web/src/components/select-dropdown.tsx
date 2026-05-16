import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";

interface SelectDropdownProps {
  onValueChange?: (value: string) => void;
  defaultValue: string | undefined;
  placeholder?: string;
  isPending?: boolean;
  items: { label: string; value: string }[] | undefined;
  disabled?: boolean;
  className?: string;
  isControlled?: boolean;
}

export function SelectDropdown({
  defaultValue,
  onValueChange,
  isPending,
  items,
  placeholder,
  disabled,
  className = "",
  isControlled = false,
}: SelectDropdownProps) {
  const handleValueChange = onValueChange
    ? (value: string | null | undefined) => {
        if (value !== null && value !== undefined) {
          onValueChange(value);
        }
      }
    : undefined;
  const defaultState = isControlled
    ? { onValueChange: handleValueChange, value: defaultValue }
    : { defaultValue, onValueChange: handleValueChange };
  return (
    <Select items={items} {...defaultState}>
      <SelectTrigger disabled={disabled} className={cn(className)}>
        <SelectValue placeholder={placeholder ?? "Select"} />
      </SelectTrigger>
      <SelectContent>
        {isPending ? (
          <SelectItem disabled value="loading" className="h-14">
            <div className="flex items-center justify-center gap-2">
              <Spinner className="h-5 w-5 animate-spin" />
              {"  "}
              Loading...
            </div>
          </SelectItem>
        ) : (
          items?.map(({ label, value }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
