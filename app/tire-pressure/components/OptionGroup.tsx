"use client";

import { cn } from "@/lib/utils";

export interface OptionGroupOption {
  value: string;
  label: string;
}

interface OptionGroupProps {
  /** Radio group name. */
  name: string;
  legend: string;
  value: string;
  options: OptionGroupOption[];
  onChange: (value: string) => void;
  /** "segment" = equal-width pill with sliding indicator; "chip" = wrapping pills. */
  variant: "segment" | "chip";
  helper?: string;
}

export function OptionGroup({
  name,
  legend,
  value,
  options,
  onChange,
  variant,
  helper,
}: OptionGroupProps) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const count = options.length;

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 block text-sm font-medium text-foreground">
        {legend}
      </legend>
      {variant === "segment" ? (
        <div
          className="relative grid rounded-xl border border-input bg-muted p-1"
          style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
        >
          <span
            aria-hidden
            className="absolute inset-y-1 left-1 rounded-lg bg-primary shadow-sm transition-transform duration-200 ease-swift"
            style={{
              width: `calc((100% - 0.5rem) / ${count})`,
              transform: `translateX(${index * 100}%)`,
            }}
          />
          {options.map((o) => {
            const active = o.value === value;
            return (
              <label
                key={o.value}
                className="relative z-10 cursor-pointer rounded-lg px-3 py-2 text-center text-sm font-medium has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50"
              >
                <input
                  type="radio"
                  name={name}
                  value={o.value}
                  checked={active}
                  onChange={() => onChange(o.value)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "transition-colors duration-200 ease-soft",
                    active
                      ? "text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {o.label}
                </span>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => {
            const active = o.value === value;
            return (
              <label
                key={o.value}
                className={cn(
                  "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-[border-color,background-color,color] duration-200 ease-soft has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-muted-foreground hover:border-foreground/30",
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={o.value}
                  checked={active}
                  onChange={() => onChange(o.value)}
                  className="sr-only"
                />
                {o.label}
              </label>
            );
          })}
        </div>
      )}
      {helper ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </fieldset>
  );
}
