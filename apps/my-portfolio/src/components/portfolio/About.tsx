import { about } from "@/lib/portfolio-data";
import { SectionHeading } from "./SectionHeading";

export function About() {
  return (
    <section id="about" className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid items-center gap-12 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- placeholder image from an arbitrary host, revisit once real image hosting is decided (see docs/PORTFOLIO_THEME_PLAN.md) */}
            <img
              src={about.image}
              alt="Portrait"
              loading="lazy"
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
        </div>
        <div className="md:col-span-3">
          <SectionHeading eyebrow="About" title={about.heading} />
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {about.body}
          </p>
        </div>
      </div>
    </section>
  );
}
