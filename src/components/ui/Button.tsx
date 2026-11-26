import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "assured" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  pill?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-hover shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/20",
  secondary:
    "bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline-variant",
  ghost:
    "bg-transparent text-on-surface hover:bg-surface-container-low",
  assured:
    "bg-assured text-on-assured hover:bg-assured-hover shadow-md shadow-assured/15 hover:shadow-lg hover:shadow-assured/20",
  outline:
    "bg-transparent border-2 border-primary text-primary hover:bg-primary-subtle",
  danger:
    "bg-error text-on-error hover:bg-error/90 shadow-md shadow-error/15",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-4 py-2 text-xs gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-7 py-3.5 text-base gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      pill = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-bold",
          "transition-all duration-200 ease-out",
          "active:scale-[0.97] disabled:opacity-55 disabled:pointer-events-none",
          "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
          pill ? "rounded-full" : "rounded-md",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading && (
          <span className="material-symbols-outlined animate-spin" style={{ fontSize: "1em" }}>
            progress_activity
          </span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
