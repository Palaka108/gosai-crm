import { IntroBackground } from "@/components/intro/IntroBackground";
import { IntroHero } from "@/components/intro/IntroHero";
import { IntroCTA } from "@/components/intro/IntroCTA";

export default function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-center">
      <IntroBackground />
      <IntroHero />
      <IntroCTA />
    </div>
  );
}
