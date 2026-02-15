import { Zap, Brain, Users, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Deal Intelligence",
    description: "Smart insights on deal health, risk scoring, and next-best-action recommendations.",
    color: "primary",
  },
  {
    icon: Users,
    title: "Stakeholder Mapping",
    description: "Visualize decision-makers, champions, and blockers across every opportunity.",
    color: "highlight",
  },
  {
    icon: TrendingUp,
    title: "Predictive Pipeline Analysis",
    description: "Forecast revenue with AI-powered probability models and trend detection.",
    color: "coral",
  },
];

export function IntroHero() {
  return (
    <div className="relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-10">
      {/* Logo */}
      <div className="animate-pop-in mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-xl shadow-primary/20 animate-glow-pulse">
          <Zap size={36} className="text-white" />
        </div>
      </div>

      {/* Headline */}
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight animate-slide-up delay-1 max-w-3xl">
        <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
          GOSAI CRM
        </span>
        <span className="block text-2xl md:text-3xl lg:text-4xl mt-3 font-medium">
          <span className="bg-gradient-to-r from-primary via-accent to-highlight bg-clip-text text-transparent">
            AI Operating System for Deals
          </span>
        </span>
      </h1>

      {/* Subtitle */}
      <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-xl animate-slide-up delay-2">
        Intelligent pipeline management powered by AI. Close deals faster with predictive insights and automated workflows.
      </p>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-14 w-full max-w-4xl">
        {features.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className={`glass-panel rounded-xl p-6 text-left hover-lift animate-slide-up delay-${i + 3}`}
            >
              <div className={`w-10 h-10 rounded-lg bg-${feature.color}/10 border border-${feature.color}/15 flex items-center justify-center mb-4`}>
                <Icon size={20} className={`text-${feature.color}`} />
              </div>
              <h3 className="text-sm font-semibold mb-2">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
