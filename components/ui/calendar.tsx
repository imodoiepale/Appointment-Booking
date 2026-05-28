"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "p-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 shadow-sm",
        className
      )}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-1 relative items-center mb-2",
        caption_label: "text-sm font-semibold text-zinc-900 dark:text-zinc-100",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex w-full mt-2",
        head_cell: "text-zinc-400 dark:text-zinc-500 rounded-md w-9 font-medium text-[10px] uppercase tracking-wider",
        row: "flex w-full mt-1",
        cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-medium text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-100 dark:hover:bg-white/10 transition-all aria-selected:opacity-100"
        ),
        day_selected: "bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white focus:bg-zinc-900 focus:text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:bg-white",
        day_today: "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white font-semibold",
        day_outside: "text-zinc-300 dark:text-zinc-700 opacity-50",
        day_disabled: "text-zinc-300 dark:text-zinc-700 opacity-50",
        day_range_middle: "aria-selected:bg-zinc-100 aria-selected:text-zinc-900 dark:aria-selected:bg-white/10 dark:aria-selected:text-white",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }