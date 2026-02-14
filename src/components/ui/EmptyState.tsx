import { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="mb-5 text-muted-foreground/30 animate-float">{icon}</div>
      <h3 className="text-lg font-medium mb-1.5 animate-slide-up delay-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm animate-slide-up delay-2">{description}</p>
      {action && <div className="animate-slide-up delay-3">{action}</div>}
    </div>
  );
}
