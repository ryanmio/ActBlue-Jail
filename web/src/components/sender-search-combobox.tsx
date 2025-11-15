"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, UserSearch } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

type SenderSearchComboboxProps = {
  selectedSenders: string[];
  pageSize: number;
  codes: string[];
  sources: string[];
};

export function SenderSearchCombobox({ selectedSenders, pageSize, codes, sources }: SenderSearchComboboxProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [senders, setSenders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedSenders));
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch matching senders
  const fetchSenders = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSenders([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/cases?q=${encodeURIComponent(query)}&limit=20&include=`);
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        // Extract unique sender names
        const uniqueSenders = new Set<string>();
        items.forEach((item: { senderName?: string | null; senderId?: string | null }) => {
          const name = item.senderName || item.senderId;
          if (name && typeof name === 'string') {
            uniqueSenders.add(name);
          }
        });
        setSenders(Array.from(uniqueSenders));
      }
    } catch (error) {
      console.error("Failed to fetch senders:", error);
      setSenders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchSenders(searchQuery);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, fetchSenders]);

  const toggleSender = (sender: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(sender)) {
      newSelected.delete(sender);
    } else {
      newSelected.add(sender);
    }
    setSelected(newSelected);
  };

  const removeSender = (sender: string) => {
    const newSelected = new Set(selected);
    newSelected.delete(sender);
    setSelected(newSelected);
    applySelection(newSelected);
  };

  const clearAll = () => {
    setSelected(new Set());
    applySelection(new Set());
  };

  const applySelection = (selection: Set<string> = selected) => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", String(pageSize));
    
    // Add codes filter if present
    codes.forEach((code) => {
      params.append("codes", code);
    });

    // Add sources filter if present
    sources.forEach((source) => {
      params.append("sources", source);
    });

    // Add selected senders
    if (selection.size > 0) {
      params.set("senders", Array.from(selection).join(","));
    }

    router.push(`/cases?${params.toString()}`);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.defaultPrevented) {
      e.preventDefault();
      applySelection();
    }
  };

  return (
    <div className="flex items-center gap-2 w-full md:w-auto">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full md:w-[180px] justify-between text-left font-normal bg-white hover:bg-slate-50 border-slate-300"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate text-slate-900">
                {selected.size > 0 
                  ? `${selected.size} sender${selected.size === 1 ? '' : 's'} selected`
                  : "Search senders"}
              </span>
            </div>
            {selected.size > 0 && (
              <Badge variant="secondary" className="ml-2 rounded-full bg-slate-900 text-white">
                {selected.size}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] md:w-[400px] p-0 bg-white border border-slate-200 shadow-lg" align="start">
          <Command shouldFilter={false} onKeyDown={handleKeyDown} className="bg-white">
            <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 bg-white">
              <Search className="h-4 w-4 shrink-0 text-slate-600" />
              <input
                type="text"
                placeholder="Type to search senders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 h-8 bg-transparent text-sm outline-none placeholder:text-slate-500 text-slate-900"
              />
            </div>
            <CommandList className="bg-white">
              {loading ? (
                <div className="py-6 text-center text-sm bg-white">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2 text-slate-600" />
                  <span className="text-slate-600">Searching...</span>
                </div>
              ) : searchQuery.trim() === "" ? (
                <div className="py-6 text-center text-sm text-slate-600 bg-white">
                  Type to search for senders
                </div>
              ) : senders.length === 0 ? (
                <CommandEmpty className="bg-white">
                  <Empty className="py-4 bg-white">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <UserSearch className="h-8 w-8 text-slate-400" />
                      </EmptyMedia>
                      <EmptyTitle className="text-base text-slate-900">No senders found</EmptyTitle>
                      <EmptyDescription className="text-xs text-slate-600">
                        Try a different search term
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </CommandEmpty>
              ) : (
                <CommandGroup className="bg-white">
                  {senders.map((sender) => (
                    <CommandItem
                      key={sender}
                      value={sender}
                      onSelect={() => toggleSender(sender)}
                      className="cursor-pointer hover:bg-slate-100 aria-selected:bg-slate-100"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="checkbox"
                          checked={selected.has(sender)}
                          onChange={() => {}}
                          className="accent-slate-900 cursor-pointer"
                        />
                        <span className="flex-1 truncate text-slate-900">{sender}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
            {(selected.size > 0 || senders.length > 0) && (
              <div className="border-t border-slate-200 p-2 flex items-center justify-between gap-2 bg-white">
                {selected.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="text-xs h-7 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                  >
                    Clear all
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => applySelection()}
                  className="ml-auto text-xs h-7 bg-slate-900 text-white hover:bg-slate-800"
                >
                  Apply {selected.size > 0 && `(${selected.size})`}
                </Button>
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>

      {/* Display selected senders as badges */}
      {selected.size > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {Array.from(selected).slice(0, 2).map((sender) => (
            <Badge
              key={sender}
              variant="secondary"
              className="max-w-[150px] pl-2 pr-1 py-1 gap-1 bg-slate-100 text-slate-900 border border-slate-300"
            >
              <span className="truncate text-xs">{sender}</span>
              <button
                onClick={() => removeSender(sender)}
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-slate-200"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {sender}</span>
              </button>
            </Badge>
          ))}
          {selected.size > 2 && (
            <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-900 border border-slate-300">
              +{selected.size - 2} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

