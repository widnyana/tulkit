import { Label } from "@/app/invoice/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/invoice/components/ui/popover";
import { CustomTooltip } from "@/app/invoice/components/ui/tooltip";
import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { useIsDesktop } from "../hooks/use-media-query";

interface LabelWithEditIconProps {
  id: string;
  children: ReactNode;
  tooltipContent: string;
  onEditClick?: () => void;
}

export function LabelWithEditIcon({
  id,
  children,
  tooltipContent,
  onEditClick,
}: LabelWithEditIconProps) {
  const isDesktop = useIsDesktop();

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        {children}
        {isDesktop ? (
          <CustomTooltip content={tooltipContent} side="right">
            <Info className="h-3.5 w-3.5 cursor-help text-gray-500" />
          </CustomTooltip>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Info className="h-3.5 w-3.5 cursor-help text-gray-500" />
            </PopoverTrigger>
            <PopoverContent className="max-w-[260px] p-3 text-sm">
              {tooltipContent}
            </PopoverContent>
          </Popover>
        )}
      </Label>
      {onEditClick && (
        <button
          type="button"
          onClick={onEditClick}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-700 hover:bg-gray-200"
        >
          ✏️
        </button>
      )}
    </div>
  );
}
