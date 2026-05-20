import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * SearchableSelect — text-search özellikli tek seçim combobox.
 *
 * @param {object} props
 * @param {string} props.value             - Şu anki değer (option.value veya "ALL")
 * @param {(v: string) => void} props.onChange
 * @param {Array<{value: string, label: string}>} props.options
 * @param {string} [props.allLabel="Tümü"] - "Tümü" seçeneğinin etiketi
 * @param {string} [props.placeholder="Seçin..."]
 * @param {string} [props.searchPlaceholder="Ara..."]
 * @param {string} [props.emptyText="Sonuç yok"]
 * @param {string} [props.className]
 * @param {string} [props.ariaLabel]
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  allLabel = "Tümü",
  placeholder = "Seçin...",
  searchPlaceholder = "Ara...",
  emptyText = "Sonuç yok",
  className,
  ariaLabel,
}) {
  const [open, setOpen] = React.useState(false);
  const isAll = value === "ALL" || value == null;
  const selectedOption = !isAll ? options.find((o) => o.value === value) : null;
  const displayLabel = isAll ? `${allLabel} (${options.length})` : (selectedOption?.label ?? placeholder);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn(
            "w-full h-9 justify-between font-normal px-3 bg-transparent",
            isAll && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate text-left">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[260px]"
      >
        <Command
          filter={(itemValue, search) => {
            // itemValue, CommandItem'in `value` prop'una eşit; label'larda arama yap
            if (itemValue === "__ALL__") {
              return allLabel.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
            }
            const opt = options.find((o) => o.value === itemValue);
            return (opt?.label ?? "").toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                key="__ALL__"
                value="__ALL__"
                onSelect={() => {
                  onChange("ALL");
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", isAll ? "opacity-100" : "opacity-0")} />
                {allLabel} ({options.length})
              </CommandItem>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.value}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default SearchableSelect;
