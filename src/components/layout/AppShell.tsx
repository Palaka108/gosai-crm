import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen dot-grid">
      <Sidebar />
      <main className="ml-60 min-h-screen relative">
        {/* Ambient glow from top-left */}
        <div className="pointer-events-none fixed top-0 left-60 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -translate-y-1/2" />
        <div className="pointer-events-none fixed bottom-0 right-0 w-80 h-80 bg-accent/3 rounded-full blur-[100px] translate-y-1/2" />
        <div className="relative max-w-6xl mx-auto px-8 py-8 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
