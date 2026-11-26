import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "full";
  padded?: boolean;
}

const sizeClasses: Record<NonNullable<ContainerProps["size"]>, string> = {
  sm:   "max-w-3xl",
  md:   "max-w-5xl",
  lg:   "max-w-6xl",
  xl:   "max-w-7xl",
  full: "max-w-screen-2xl",
};

export function Container({
  size = "xl",
  padded = true,
  className,
  children,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        sizeClasses[size],
        padded && "px-4 sm:px-6 lg:px-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
