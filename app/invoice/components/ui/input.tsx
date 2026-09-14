import { cn } from "@/lib/utils";
import * as React from "react";

const Input = React.memo(
  React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
    ({ className, type, ...props }, ref) => {
      return (
        <input
          type={type}
          autoComplete="off"
          className={cn(
            "h-8 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-readonly:cursor-not-allowed aria-readonly:opacity-50 aria-readonly:bg-muted/50",
            type === "date" && "w-auto",
            type === "search" &&
              "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none",
            type === "file" &&
              "p-0 pr-3 italic text-muted-foreground file:me-3 file:h-full file:border-0 file:border-r file:border-solid file:border-input file:bg-transparent file:px-3 file:text-sm file:font-medium file:not-italic file:text-foreground",
            className,
          )}
          ref={ref}
          {...props}
        />
      );
    },
  ),
);
Input.displayName = "Input";

export { Input };
