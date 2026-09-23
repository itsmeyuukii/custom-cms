import { SiteNav } from "@/components/portfolio/SiteNav";
import { Hero } from "@/components/portfolio/Hero";
import { ProjectGrid } from "@/components/portfolio/ProjectGrid";
import { Services } from "@/components/portfolio/Services";
import { About } from "@/components/portfolio/About";
import { ContactCTA } from "@/components/portfolio/ContactCTA";
import { SiteFooter } from "@/components/portfolio/SiteFooter";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <Hero />
        <ProjectGrid />
        <Services />
        <About />
        <ContactCTA />
      </main>
      <SiteFooter />
    </div>
  );
}
