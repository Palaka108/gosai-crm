export function IntroBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div
        className="absolute inset-0 animate-intro-gradient"
        style={{
          background:
            "radial-gradient(ellipse at 20% 20%, rgba(99, 102, 241, 0.12) 0%, transparent 50%), " +
            "radial-gradient(ellipse at 80% 80%, rgba(111, 231, 221, 0.08) 0%, transparent 50%), " +
            "radial-gradient(ellipse at 50% 50%, rgba(129, 140, 248, 0.06) 0%, transparent 60%)",
        }}
      />

      {/* Subtle dot grid */}
      <div className="absolute inset-0 dot-grid opacity-40" />

      {/* Floating orbs */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full animate-drift"
        style={{
          top: "10%",
          left: "15%",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full animate-drift"
        style={{
          bottom: "10%",
          right: "10%",
          background: "radial-gradient(circle, rgba(111, 231, 221, 0.05) 0%, transparent 70%)",
          filter: "blur(50px)",
          animationDelay: "-7s",
        }}
      />
      <div
        className="absolute w-[300px] h-[300px] rounded-full animate-drift"
        style={{
          top: "50%",
          right: "30%",
          background: "radial-gradient(circle, rgba(255, 138, 91, 0.04) 0%, transparent 70%)",
          filter: "blur(40px)",
          animationDelay: "-12s",
        }}
      />

      {/* Decorative rings */}
      <div
        className="absolute w-64 h-64 rounded-full border border-primary/5 animate-pulse-ring"
        style={{ top: "20%", left: "60%" }}
      />
      <div
        className="absolute w-48 h-48 rounded-full border border-highlight/5 animate-pulse-ring"
        style={{ bottom: "25%", left: "20%", animationDelay: "-2s" }}
      />
    </div>
  );
}
