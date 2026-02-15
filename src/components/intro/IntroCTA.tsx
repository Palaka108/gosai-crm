import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { LogIn, ArrowRight } from "lucide-react";

export function IntroCTA() {
  return (
    <div className="relative z-10 flex flex-col items-center gap-4 pb-16 animate-slide-up delay-6">
      <div className="flex items-center gap-4">
        <Link to="/login">
          <Button size="lg" className="px-8">
            <LogIn size={18} />
            Sign In
          </Button>
        </Link>
        <Link to="/login">
          <Button variant="secondary" size="lg" className="px-8">
            Enter Dashboard
            <ArrowRight size={18} />
          </Button>
        </Link>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Built for AI consulting teams
      </p>
    </div>
  );
}
