import { services } from "@/lib/portfolio-data";
import { SectionHeading } from "./SectionHeading";

export function Services() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionHeading
          eyebrow="Services"
          title="What I can do for you."
          align="center"
        />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {services.map((service, i) => (
            <div
              key={service.title}
              className="rounded-xl border border-border bg-card p-8 transition-colors hover:border-ember/50"
            >
              <span className="font-display text-sm font-bold text-ember">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold text-card-foreground">
                {service.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
