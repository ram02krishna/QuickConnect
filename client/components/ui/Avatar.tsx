import * as React from "react";
import { cn } from "../../lib/utils";

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showStatus?: boolean;
  isOnline?: boolean;
}

export function Avatar({
  src,
  name = "User",
  size = "md",
  className,
  showStatus = false,
  isOnline = false,
}: AvatarProps) {
  // Get initials if no image
  const getInitials = (n: string) => {
    return (n || "User")
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const sizeClasses = {
    xs: "h-6 w-6 text-xs",
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-14 w-14 text-xl",
    xl: "h-20 w-20 text-3xl",
  };

  return (
    <div className="relative inline-block select-none">
      <div
        className={cn(
          "flex items-center justify-center rounded-full overflow-hidden font-semibold border border-zinc-700/30 dark:border-zinc-800/80 light:border-zinc-300 bg-brand-primary/10 text-brand-primary",
          sizeClasses[size],
          className
        )}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover"
            onError={(e) => {
              // Hide image if fails to load and fallback to initials
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>

      {showStatus && (
        <span
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900",
            isOnline ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
          )}
          aria-label={isOnline ? "Online" : "Offline"}
        />
      )}

    </div>
  );
}
