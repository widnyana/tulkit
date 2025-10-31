import Link from "next/link";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  href?: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: "blue" | "purple" | "orange" | "green" | "indigo" | "gray";
  disabled?: boolean;
}

const colorConfig = {
  blue: {
    bg: "bg-blue-100",
    icon: "text-blue-600",
    hoverBg: "group-hover:bg-blue-500",
    hoverIcon: "group-hover:text-black",
    border: "hover:border-blue-500",
    arrow: "text-blue-500 group-hover:text-blue-700",
  },
  purple: {
    bg: "bg-purple-100",
    icon: "text-purple-600",
    hoverBg: "group-hover:bg-purple-500",
    hoverIcon: "group-hover:text-black",
    border: "hover:border-purple-500",
    arrow: "text-purple-500 group-hover:text-purple-700",
  },
  orange: {
    bg: "bg-orange-100",
    icon: "text-orange-600",
    hoverBg: "group-hover:bg-orange-500",
    hoverIcon: "group-hover:text-black",
    border: "hover:border-orange-500",
    arrow: "text-orange-500 group-hover:text-orange-700",
  },
  green: {
    bg: "bg-green-100",
    icon: "text-green-600",
    hoverBg: "group-hover:bg-green-500",
    hoverIcon: "group-hover:text-black",
    border: "hover:border-green-500",
    arrow: "text-green-500 group-hover:text-green-700",
  },
  indigo: {
    bg: "bg-indigo-100",
    icon: "text-indigo-600",
    hoverBg: "group-hover:bg-indigo-500",
    hoverIcon: "group-hover:text-black",
    border: "hover:border-indigo-500",
    arrow: "text-indigo-500 group-hover:text-indigo-700",
  },
  gray: {
    bg: "bg-gray-100",
    icon: "text-gray-400",
    hoverBg: "",
    hoverIcon: "",
    border: "",
    arrow: "text-gray-400",
  },
};

export function ToolCard({
  href,
  title,
  description,
  icon,
  color,
  disabled = false,
}: ToolCardProps) {
  const colors = colorConfig[color];

  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div
          className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center transition-colors",
            colors.bg,
            colors.hoverBg
          )}
        >
          <div className={cn("w-6 h-6 transition-colors", colors.icon, colors.hoverIcon)}>
            {icon}
          </div>
        </div>
        <span className={cn("transition-colors", colors.arrow)}>
          {disabled ? "Soon" : "→"}
        </span>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600 text-sm">{description}</p>
    </>
  );

  if (disabled || !href) {
    return (
      <div className="bg-gray-50 rounded-lg shadow-lg p-6 border border-gray-200 opacity-60 cursor-not-allowed">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group bg-gray-50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-200",
        colors.border
      )}
    >
      {content}
    </Link>
  );
}
