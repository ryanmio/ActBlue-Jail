"use client";

import * as React from "react";
import {
  Command as CommandPrimitive,
  CommandInput as CommandInputPrimitive,
  CommandList as CommandListPrimitive,
  CommandEmpty as CommandEmptyPrimitive,
  CommandGroup as CommandGroupPrimitive,
  CommandItem as CommandItemPrimitive,
} from "cmdk";
import { cn } from "@/lib/utils";

const CommandRoot = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof CommandPrimitive>>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive ref={ref} className={cn("flex h-full w-full flex-col overflow-hidden rounded-md border border-slate-200 bg-white text-slate-900", className)} {...props} />
  )
);
CommandRoot.displayName = "Command";

const CommandInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof CommandInputPrimitive>>(
  ({ className, ...props }, ref) => (
    <div className="flex items-center border-b border-slate-200 px-2">
      <CommandInputPrimitive ref={ref} className={cn("h-9 w-full bg-transparent py-2 text-sm outline-none placeholder:text-slate-400", className)} {...props} />
    </div>
  )
);
CommandInput.displayName = "CommandInput";

const CommandList = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof CommandListPrimitive>>(
  ({ className, ...props }, ref) => (
    <CommandListPrimitive ref={ref} className={cn("max-h-64 overflow-auto p-1", className)} {...props} />
  )
);
CommandList.displayName = "CommandList";

const CommandEmpty = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof CommandEmptyPrimitive>>(
  ({ className, ...props }, ref) => (
    <CommandEmptyPrimitive ref={ref} className={cn("py-6 text-center text-sm text-slate-500", className)} {...props} />
  )
);
CommandEmpty.displayName = "CommandEmpty";

const CommandGroup = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof CommandGroupPrimitive>>(
  ({ className, ...props }, ref) => (
    <CommandGroupPrimitive ref={ref} className={cn("overflow-hidden p-1 text-sm", className)} {...props} />
  )
);
CommandGroup.displayName = "CommandGroup";

const CommandItem = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof CommandItemPrimitive>>(
  ({ className, ...props }, ref) => (
    <CommandItemPrimitive ref={ref} className={cn("relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 aria-selected:bg-slate-100", className)} {...props} />
  )
);
CommandItem.displayName = "CommandItem";

export { CommandRoot as Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem };


