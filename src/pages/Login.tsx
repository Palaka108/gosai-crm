import { useState, FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Zap } from "lucide-react";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signin") {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error);
      } else {
        setSignUpSuccess(true);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: "radial-gradient(ellipse at 30% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(129, 140, 248, 0.1) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(99, 102, 241, 0.05) 0%, transparent 70%)",
          animation: "gradient-shift 8s ease-in-out infinite",
          backgroundSize: "200% 200%",
        }}
      />

      {/* Orbiting decorative dots */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="w-2 h-2 rounded-full bg-primary/40" style={{ animation: "orbit 12s linear infinite" }} />
        <div className="w-1.5 h-1.5 rounded-full bg-accent/30" style={{ animation: "orbit-reverse 15s linear infinite" }} />
        <div className="w-1 h-1 rounded-full bg-primary/20" style={{ animation: "orbit 20s linear infinite reverse" }} />
      </div>

      {/* Dot grid */}
      <div className="absolute inset-0 dot-grid opacity-50" />

      {/* Form card */}
      <div className="w-full max-w-sm space-y-8 relative z-10 animate-scale-in">
        {/* Glass card wrapper */}
        <div className="rounded-2xl border border-border/50 glass p-8 shadow-2xl shadow-primary/5 gradient-border">
          {/* Logo / Header */}
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 mb-3 animate-pop-in animate-glow-pulse">
              <Zap size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight animate-slide-up delay-1">
              <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">GOSAI</span>
              <span className="text-primary ml-1.5">CRM</span>
            </h1>
            <p className="text-sm text-muted-foreground animate-slide-up delay-2">
              {mode === "signin"
                ? "Sign in to your account"
                : "Create a new account"}
            </p>
          </div>

          {/* Sign-up confirmation */}
          {signUpSuccess && (
            <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-center mb-6 animate-scale-in">
              <p className="text-sm text-success">
                Check your email for a confirmation link, then sign in.
              </p>
            </div>
          )}

          {/* Form */}
          {!signUpSuccess && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="animate-slide-up delay-3">
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="animate-slide-up delay-4">
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                />
              </div>

              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 animate-scale-in">
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              <div className="animate-slide-up delay-5">
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="w-full"
                >
                  {loading
                    ? "Please wait…"
                    : mode === "signin"
                    ? "Sign In"
                    : "Create Account"}
                </Button>
              </div>
            </form>
          )}

          {/* Toggle mode */}
          <p className="text-center text-sm text-muted-foreground mt-6 animate-fade-in delay-6">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                    setSignUpSuccess(false);
                  }}
                  className="text-primary hover:text-accent transition-colors font-medium cursor-pointer"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    setSignUpSuccess(false);
                  }}
                  className="text-primary hover:text-accent transition-colors font-medium cursor-pointer"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
