"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { SearchSource, SearchSuggestion } from "@/features/search/types";

type SearchComboboxProps = {
  name: string;
  source: SearchSource;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  onValueChange?: (value: string) => void;
};

export function SearchCombobox({
  name,
  source,
  defaultValue = "",
  placeholder = "Search or select",
  className = "",
  required,
  onValueChange
}: SearchComboboxProps) {
  const listId = useId();
  const blurTimer = useRef<number | null>(null);
  const [displayValue, setDisplayValue] = useState(defaultValue);
  const [submittedValue, setSubmittedValue] = useState(defaultValue);
  const [options, setOptions] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!focused) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ source, q: displayValue.trim() });
        const response = await fetch(`/api/search/suggestions?${params}`, { signal: controller.signal, credentials: "include" });
        if (!response.ok) throw new Error("Unable to load suggestions");
        const body = (await response.json()) as { suggestions?: SearchSuggestion[] };
        const nextOptions = Array.isArray(body.suggestions) ? body.suggestions : [];
        setOptions(nextOptions);
        setActiveIndex(-1);
        setOpen(true);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setOptions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [displayValue, focused, source]);

  function updateValue(nextValue: string) {
    setDisplayValue(nextValue);
    setSubmittedValue(nextValue);
    onValueChange?.(nextValue);
  }

  function select(option: SearchSuggestion) {
    setDisplayValue(option.label);
    setSubmittedValue(option.value);
    onValueChange?.(option.value);
    setOpen(false);
    setActiveIndex(-1);
  }

  return (
    <div className={`relative ${className}`}>
      <input type="hidden" name={name} value={submittedValue} />
      <div className="flex h-10 items-center gap-2 rounded-md border bg-white px-3">
        <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          autoComplete="off"
          value={displayValue}
          placeholder={placeholder}
          required={required}
          onChange={(event) => updateValue(event.target.value)}
          onFocus={() => {
            if (blurTimer.current) window.clearTimeout(blurTimer.current);
            setFocused(true);
            setOpen(true);
          }}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => {
              setFocused(false);
              setOpen(false);
            }, 120);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => Math.min(current + 1, options.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter" && open && activeIndex >= 0) {
              event.preventDefault();
              select(options[activeIndex]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {loading ? <span className="text-xs text-muted">Loading…</span> : null}
      </div>
      {open ? (
        <div id={listId} role="listbox" className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-white p-1 shadow-lg">
          {options.length > 0 ? options.map((option, index) => (
            <button
              id={`${listId}-${index}`}
              key={`${option.value}-${index}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={`block w-full rounded-sm px-3 py-2 text-left hover:bg-accent/35 ${index === activeIndex ? "bg-accent/35" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(option)}
            >
              <span className="block text-sm font-semibold">{option.label}</span>
              {option.description ? <span className="block text-xs text-muted">{option.description}</span> : null}
            </button>
          )) : (
            <p className="px-3 py-4 text-sm text-muted">{loading ? "Loading suggestions…" : "No matching records"}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
