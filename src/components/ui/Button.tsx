import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg hover:shadow-primary/25 active:scale-[0.97]",
  secondary:
    "bg-muted text-foreground hover:bg-muted/80 border border-border hover:border-primary/30 active:scale-[0.97]",
  ghost:
    "text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-[0.97]",
  destructive:
    "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 active:scale-[0.97]",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-2.5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    />
  )
);
Button.displayName = "Button";
