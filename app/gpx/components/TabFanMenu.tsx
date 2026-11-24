"use client";

import { X, type LucideIcon } from "lucide-react";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const STICK_START = 30;
const STICK_LENGTH = 188;
const ARC_CENTER_DEG = -135;
const MAX_SPREAD_DEG = 90;
const MIN_ACTIONS = 2;
const MAX_ACTIONS = 6;
const STICK_STAGGER_MS = 26;
const SPREAD_BY_COUNT: Record<number, number> = {
  2: 80,
  3: 90,
  4: 100,
  5: 120,
  6: 120,
};

export interface TabFanItem<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
}

function requestedSpread(count: number): number {
  if (count <= MIN_ACTIONS) return SPREAD_BY_COUNT[MIN_ACTIONS];
  return SPREAD_BY_COUNT[Math.min(count, MAX_ACTIONS)];
}

interface TabFanMenuProps<T extends string> {
  items: readonly TabFanItem<T>[];
  value: T;
  onSelect: (next: T) => void;
}

export function TabFanMenu<T extends string>({
  items,
  value,
  onSelect,
}: TabFanMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const [animated, setAnimated] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef(new Map<T, HTMLButtonElement>());

  const arc = useMemo(() => {
    const spread = Math.min(requestedSpread(items.length), MAX_SPREAD_DEG);
    const start = ARC_CENTER_DEG - spread / 2;
    const step = items.length > 1 ? spread / (items.length - 1) : 0;
    return {
      start,
      step,
      sticks: items.map((item, index) => ({
        item,
        angle: start + step * index,
      })),
    };
  }, [items]);

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeMenu(true);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, closeMenu]);

  useEffect(() => {
    if (!open) return;
    const target =
      itemRefs.current.get(value) ?? itemRefs.current.values().next().value;
    target?.focus();
  }, [open, value]);

  const activeLabel = items.find((item) => item.value === value)?.label;

  if (items.length < MIN_ACTIONS) return null;

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden sm:hidden"
    >
      <div className="absolute right-5 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] size-14">
        {open && (
          <div
            role="group"
            aria-label="GPX sections"
            className="absolute inset-0"
          >
            {arc.sticks.map(({ item, angle }, index) => {
              const isActive = item.value === value;
              const Icon = item.icon;
              return (
                <div
                  key={item.value}
                  className={[
                    "absolute top-1/2 left-1/2 size-0",
                    animated ? "gpx-fan-stick-open" : "",
                  ].join(" ")}
                  style={
                    {
                      "--fan-angle": `${angle}deg`,
                      "--fan-closed": `${arc.start}deg`,
                      transform: `rotate(${angle}deg)`,
                      animationDelay: `${index * STICK_STAGGER_MS}ms`,
                      zIndex: isActive ? 2 : 1,
                    } as CSSProperties
                  }
                >
                  <button
                    type="button"
                    ref={(node) => {
                      if (node) itemRefs.current.set(item.value, node);
                      else itemRefs.current.delete(item.value);
                    }}
                    aria-current={isActive ? "true" : undefined}
                    aria-label={item.label}
                    onClick={() => {
                      onSelect(item.value);
                      closeMenu(true);
                    }}
                    style={{
                      left: STICK_START,
                      width: STICK_LENGTH - STICK_START,
                    }}
                    className={[
                      "pointer-events-auto absolute top-1/2 flex h-11 -translate-y-1/2 items-center rounded-md border shadow-md transition-colors duration-150",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-[#c9b48f] bg-[#e8d8bf] text-foreground dark:border-[#4d3f2e] dark:bg-[#332a20]",
                    ].join(" ")}
                  >
                    <span className="absolute top-1/2 right-3 flex -translate-y-1/2 rotate-180 items-center gap-1.5">
                      <Icon aria-hidden="true" className="size-4 shrink-0" />
                      <span className="text-xs font-medium whitespace-nowrap">
                        {item.label}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-label={
            open
              ? "Close section menu"
              : `Open section menu: ${activeLabel ?? "sections"}`
          }
          onClick={(event) => {
            setAnimated(event.detail !== 0);
            setOpen((current) => !current);
          }}
          className="pointer-events-auto absolute inset-0 flex size-14 items-center justify-center rounded-full border border-border bg-primary text-primary-foreground transition-transform duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {open ? (
            <X aria-hidden="true" className="size-5" />
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20.5 3.2 7.6a15.5 15.5 0 0 1 17.6 0Z" />
              <path d="M12 20.5 6.2 11.4" />
              <path d="M12 20.5V6.9" />
              <path d="M12 20.5l5.8-9.1" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
