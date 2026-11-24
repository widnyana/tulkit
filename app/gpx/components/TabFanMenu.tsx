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

const ITEM_PITCH = 50;
const ITEM_BASE_X = 140;
const ITEM_BASE_Y = 46;
const ITEM_X_STEP = 11;
const LEAF_OUTER_X = 200;
const LEAF_OUTER_Y = 292;
const LEAF_INNER_X = 52;
const LEAF_INNER_Y = 76;
const LEAF_SIZE_X = LEAF_OUTER_X * 2;
const LEAF_SIZE_Y = LEAF_OUTER_Y * 2;
const LEAF_CENTER_X = LEAF_OUTER_X;
const LEAF_CENTER_Y = LEAF_OUTER_Y;
const RIB_STAGGER_MS = 24;

export interface TabFanItem<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
}

function ellipsePoint(
  radiusX: number,
  radiusY: number,
  degrees: number,
): [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [-radiusX * Math.cos(radians), -radiusY * Math.sin(radians)];
}

function itemOffset(index: number, count: number): [number, number] {
  const spread = count > 1 ? 4 / (count - 1) : 0;
  return [
    -(ITEM_BASE_X - ITEM_X_STEP * index * spread),
    -(ITEM_BASE_Y + ITEM_PITCH * index * spread),
  ];
}

function itemAngle(offsetX: number, offsetY: number): number {
  return (Math.atan2(-offsetY, -offsetX) * 180) / Math.PI;
}

function leafPath(): string {
  const steps = 28;
  const outer: string[] = [];
  const inner: string[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const degrees = 6 + (78 * step) / steps;
    const [outerX, outerY] = ellipsePoint(LEAF_OUTER_X, LEAF_OUTER_Y, degrees);
    outer.push(`${LEAF_CENTER_X + outerX},${LEAF_CENTER_Y + outerY}`);
    const [innerX, innerY] = ellipsePoint(LEAF_INNER_X, LEAF_INNER_Y, degrees);
    inner.push(`${LEAF_CENTER_X + innerX},${LEAF_CENTER_Y + innerY}`);
  }
  return `M ${outer.join(" L ")} L ${inner.reverse().join(" L ")} Z`;
}

const LEAF_PATH = leafPath();

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

  const layout = useMemo(
    () =>
      items.map((item, index) => {
        const [offsetX, offsetY] = itemOffset(index, items.length);
        const angle = itemAngle(offsetX, offsetY);
        const [ribStartX, ribStartY] = ellipsePoint(
          LEAF_INNER_X * 0.9,
          LEAF_INNER_Y * 0.9,
          angle,
        );
        const [ribEndX, ribEndY] = ellipsePoint(
          LEAF_OUTER_X - 8,
          LEAF_OUTER_Y - 8,
          angle,
        );
        return {
          item,
          offsetX,
          offsetY,
          rib: [ribStartX, ribStartY, ribEndX, ribEndY] as const,
        };
      }),
    [items],
  );

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

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden sm:hidden"
    >
      <div className="absolute right-5 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] size-14">
        {open && (
          <>
            <div
              className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ width: LEAF_SIZE_X, height: LEAF_SIZE_Y }}
            >
              <svg
                aria-hidden="true"
                width={LEAF_SIZE_X}
                height={LEAF_SIZE_Y}
                viewBox={`0 0 ${LEAF_SIZE_X} ${LEAF_SIZE_Y}`}
                className={animated ? "gpx-fan-leaf-enter" : undefined}
              >
                <path
                  d={LEAF_PATH}
                  className="fill-background stroke-border"
                  strokeWidth={1}
                />
                {layout.map(({ item, rib }) => (
                  <line
                    key={item.value}
                    x1={LEAF_CENTER_X + rib[0]}
                    y1={LEAF_CENTER_Y + rib[1]}
                    x2={LEAF_CENTER_X + rib[2]}
                    y2={LEAF_CENTER_Y + rib[3]}
                    className="stroke-border"
                    strokeWidth={1}
                    opacity={0.7}
                  />
                ))}
              </svg>
            </div>

            <div
              role="group"
              aria-label="GPX sections"
              className="absolute inset-0"
            >
              {layout.map(({ item, offsetX, offsetY }, index) => {
                const isActive = item.value === value;
                const Icon = item.icon;
                return (
                  <button
                    key={item.value}
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
                    style={
                      {
                        "--fan-x": `${offsetX}px`,
                        "--fan-y": `${offsetY}px`,
                        animationDelay: `${index * RIB_STAGGER_MS}ms`,
                      } as CSSProperties
                    }
                    className={[
                      "gpx-fan-rib pointer-events-auto absolute top-1/2 left-1/2 flex h-11 w-[7.25rem] items-center gap-2 rounded-lg border px-3 text-xs transition-colors duration-150",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      animated ? "gpx-fan-rib-enter" : "",
                      isActive
                        ? "border-primary bg-primary font-semibold text-primary-foreground"
                        : "border-border bg-background font-medium text-foreground",
                    ].join(" ")}
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </>
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
