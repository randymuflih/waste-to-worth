import { NavbarPublic } from "@/components/public/NavbarPublic";
import { HeroSection } from "@/components/public/HeroSection";
import { MaterialSection } from "@/components/public/MaterialSection";
import { HowItWorksSection } from "@/components/public/HowItWorksSection";
import { TrackingSection } from "@/components/public/TrackingSection";
import { ImpactSection } from "@/components/public/ImpactSection";

export default function LandingPage() {
  return (
    <main style={{ background: "#ffffff", minHeight: "100vh" }}>
      <NavbarPublic />
      <HeroSection />
      <MaterialSection />
      <HowItWorksSection />
      <TrackingSection />
      <ImpactSection />
    </main>
  );
}
