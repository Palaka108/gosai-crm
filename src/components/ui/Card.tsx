import { HTMLAttributes, forwardRef } from "react";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div ref={ref} className={`rounded-xl border border-border bg-card p-5 shadow-sm ${className}`} {...props} />
  )
);
Card.displayName = "Card";

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className = "", ...props }, ref) => (
    <h3 ref={ref} className={`text-sm font-medium text-muted-foreground uppercase tracking-wider ${className}`} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

export const CardValue = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div ref={ref} className={`text-3xl font-semibold tracking-tight ${className}`} {...props} />
  )
);
CardValue.displayName = "CardValue";
