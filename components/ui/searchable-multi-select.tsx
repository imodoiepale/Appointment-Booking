"use client";

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

export interface MultiOption {
  value: string;
  label: string;
  sublabel?: string;
  [key: string]: any;
}

interface SearchableMultiSelectProps {
  values: string[];
  onValuesChange: (values: string[]) => void;
  options: MultiOption[];
  placeholder?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  invalid?: boolean;
  renderTag?: (option: MultiOption, onRemove: () => void) => React.ReactNode;
}

export function SearchableMultiSelect({
  values,
  onValuesChange,
  options = [],
  placeholder = "Select options…",
  emptyMessage = "No results found.",
  searchPlaceholder = "Search…",
  className,
  buttonClassName,
  disabled = false,
  invalid = false,
  renderTag,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const normalizedOptions = React.useMemo(() => {
    const seen = new Set<string>();
    return (options ?? []).filter((o) => {
      const key = String(o?.value ?? "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [options]);

  const filteredOptions = React.useMemo(() => {
    if (!search) return normalizedOptions;
    const q = search.toLowerCase();
    return normalizedOptions.filter(
      (o) =>
        String(o.label || o.value || "").toLowerCase().includes(q) ||
        String(o.sublabel || "").toLowerCase().includes(q)
    );
  }, [normalizedOptions, search]);

  const selectedOptions = React.useMemo(
    () => normalizedOptions.filter((o) => values.includes(o.value)),
    [normalizedOptions, values]
  );

  const toggle = (value: string) => {
    onValuesChange(
      values.includes(value)
        ? values.filter((v) => v !== value)
        : [...values, value]
    );
  };

  const remove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValuesChange(values.filter((v) => v !== value));
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full min-h-10 h-auto justify-between font-normal text-left flex-wrap gap-1 py-1.5 px-3",
            invalid && "border-red-500",
            buttonClassName
          )}
        >
          <span className="flex flex-wrap gap-1 flex-1 min-w-0">
            {selectedOptions.length === 0 ? (
              <span className="text-muted-foreground truncate">{placeholder}</span>
            ) : renderTag ? (
              selectedOptions.map((o) =>
                renderTag(o, () => onValuesChange(values.filter((v) => v !== o.value)))
              )
            ) : (
              selectedOptions.map((o) => (
                <span
                  key={o.value}
                  className="inline-flex items-center gap-1 bg-slate-100 rounded-md px-2 py-0.5 text-xs font-semibold text-blue-700"
                >
                  {o.label}
                  <span
                    onClick={(e) => remove(o.value, e)}
                    className="cursor-pointer text-slate-400 hover:text-red-500 flex items-center"
                  >
                    <X size={10} />
                  </span>
                </span>
              ))
            )}
          </span>
          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-[var(--radix-popover-trigger-width)] p-0", className)}
        align="start"
      >
        <Command className="rounded-lg border shadow-md" shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
            className="h-9"
          />
          <CommandList
            className="max-h-[280px] overflow-y-auto overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            <CommandGroup>
              {filteredOptions.map((option, idx) => {
                const selected = values.includes(option.value);
                return (
                  <CommandItem
                    key={`${option.value}::${idx}`}
                    value={option.value}
                    onSelect={() => toggle(option.value)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        selected ? "opacity-100 text-blue-700" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-sm font-medium">{option.label}</span>
                      {option.sublabel && (
                        <span className="truncate text-xs text-muted-foreground">{option.sublabel}</span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
              {filteredOptions.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
