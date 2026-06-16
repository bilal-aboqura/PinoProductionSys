"use client";

import { useEffect, useRef } from "react";

type ScannerOptions = {
  onScan: (value: string) => void;
  minLength?: number;
  maxInterKeyDelayMs?: number;
  resetDelayMs?: number;
  enabled?: boolean;
};

export function useKeyboardScanner({
  onScan,
  minLength = 4,
  maxInterKeyDelayMs = 55,
  resetDelayMs = 120,
  enabled = true
}: ScannerOptions) {
  const bufferRef = useRef("");
  const lastKeyAtRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function resetSoon() {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        bufferRef.current = "";
        lastKeyAtRef.current = 0;
      }, resetDelayMs);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const now = Date.now();
      const target = event.target as HTMLElement | null;
      const isEditable = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

      if (event.key === "Enter") {
        const value = bufferRef.current.trim();
        if (value.length >= minLength && now - lastKeyAtRef.current <= resetDelayMs) {
          if (!isEditable) event.preventDefault();
          onScan(value);
        }
        bufferRef.current = "";
        lastKeyAtRef.current = 0;
        return;
      }

      if (event.key.length !== 1) return;
      if (lastKeyAtRef.current && now - lastKeyAtRef.current > maxInterKeyDelayMs) {
        bufferRef.current = "";
      }
      bufferRef.current += event.key;
      lastKeyAtRef.current = now;
      resetSoon();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [enabled, maxInterKeyDelayMs, minLength, onScan, resetDelayMs]);
}
