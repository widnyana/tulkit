import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import * as React from "react";

export interface SelectPropsNative
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

/**
 * https://originui.com/selects
 */
const SelectNative = React.forwardRef<HTMLSelectElement, SelectPropsNative>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            "peer block w-full cursor-pointer appearance-none items-center rounded-md border border-gray-300 bg-white text-sm text-slate-950 shadow-sm shadow-black/5 transition-shadow focus-visible:border-indigo-500 focus-visible:ring focus-visible:ring-indigo-200 focus-visible:ring-opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 has-[option[disabled]:checked]:text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:focus-visible:border-slate-300 dark:focus-visible:ring-slate-300/20 dark:has-[option[disabled]:checked]:text-slate-400",
            props.multiple
              ? "py-1 [&>*]:px-3 [&>*]:py-1 [&_option:checked]:bg-slate-100 dark:[&_option:checked]:bg-slate-800"
              : "h-9 pe-8 ps-3",
            className,
          )}
          ref={ref}
          translate="no"
          {...props}
        >
          {children}
        </select>
        {!props.multiple && (
          <span className="pointer-events-none absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center text-slate-500/80 peer-disabled:opacity-50 dark:text-slate-400/80">
            <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
          </span>
        )}
      </div>
    );
  },
);
SelectNative.displayName = "SelectNative";

export { SelectNative };
