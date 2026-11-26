import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant =
  | "assured"   // emerald — DrivioCars Assured
  | "live"      // amber with pulse — live auction
  | "primary"   // blue
  | "secondary" // slate
  | "success"   // green
  | "warning"   // amber
  | "error"     // red
  | "neutral";  // gray

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: string; // material symbol name
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  assured:   "bg-assured text-on-assured shadow-sm shadow-assured/20",
  live:      "badge-live",
  primary:   "bg-primary-subtle text-primary border border-primary-border",
  secondary: "bg-surface-container text-on-surface-variant border border-outline-variant",
  success:   "bg-assured-container text-on-assured-container border border-assured-border",
  warning:   "bg-live-container text-on-live-container border border-live-border",
  error:     "bg-error-container text-on-error-container",
  neutral:   "bg-surface-container-high text-on-surface-variant",
};

export function Badge({
  variant = "neutral",
  icon,
  dot,
  className,
  children,
  ...props
}: BadgeProps) {
  if (variant === "live") {
    return (
      <span
        className={cn("badge-live label-caps", className)}
        {...props}
      >
        {children}
      </span>
    );
  }

  if (variant === "assured") {
    return (
      <span
        className={cn("badge-assured", className)}
        {...props}
      >
        {icon && (
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "11px", fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        )}
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full label-caps",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 flex-shrink-0" />
      )}
      {icon && (
        <span
          className="material-symbols-outlined"
          style={{ fontSize: "11px" }}
        >
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
