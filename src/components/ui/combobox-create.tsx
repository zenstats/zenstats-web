import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Suggestion {
  value: string;
  label: string;
}

interface ComboBoxCreateProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fetchSuggestions: (input: string) => Promise<Suggestion[]>;
  debounceMs?: number;
  className?: string;
  disabled?: boolean;
  /** 每次输入都同步 onChange（用于实时更新父组件）；默认 false，仅在 Enter/选择时触发 */
  liveSync?: boolean;
}

export default function ComboBoxCreate({
  value,
  onChange,
  placeholder = "Search...",
  fetchSuggestions,
  debounceMs = 300,
  className,
  disabled = false,
  liveSync = false,
}: ComboBoxCreateProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchedRef = useRef("");

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doFetch = useCallback(
    (query: string) => {
      if (query !== "" && lastFetchedRef.current === query) return;
      lastFetchedRef.current = query;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const items = await fetchSuggestions(query);
          setSuggestions(items);
          setOpen(items.length > 0);
          setActiveIndex(-1);
        } catch {
          setSuggestions([]);
          setOpen(false);
        } finally {
          setLoading(false);
        }
      }, query !== "" ? debounceMs : 0);
    },
    [fetchSuggestions, debounceMs]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (liveSync) onChange(val);
    if (val.trim()) {
      doFetch(val.trim());
    } else {
      setSuggestions([]);
      setOpen(false);
      lastFetchedRef.current = "";
    }
  };

  const selectItem = (item: Suggestion) => {
    setInputValue(item.value);
    onChange(item.value);
    setOpen(false);
    setSuggestions([]);
    lastFetchedRef.current = item.value;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) {
      if (e.key === "Enter" && inputValue.trim()) {
        e.preventDefault();
        onChange(inputValue.trim());
        setOpen(false);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          selectItem(suggestions[activeIndex]);
        } else if (inputValue.trim()) {
          onChange(inputValue.trim());
          setOpen(false);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setOpen(true);
    } else {
      doFetch(inputValue.trim());
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        className="h-8 font-mono text-xs pr-8"
        autoComplete="off"
      />
      {loading && (
        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
      )}
      {/* Inline suggestion list — no absolute/fixed/portal, renders in normal flow */}
      {open && suggestions.length > 0 && (
        <div className="mt-1 max-h-[180px] overflow-y-auto rounded-md border bg-white dark:bg-gray-950 shadow-lg z-50 relative">
          {suggestions.map((item, index) => (
            <button
              key={item.value}
              type="button"
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-left transition-colors cursor-pointer",
                index === activeIndex
                  ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                selectItem(item);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
