import { site } from "@/lib/portfolio-data";

export function ContactCTA() {
  return (
    <section id="contact" className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-24 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ember">
          Let&apos;s talk
        </p>
        <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-bold text-foreground sm:text-5xl text-balance">
          Have a project in mind?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          I&apos;m currently taking on new work. Tell me about your idea and
          let&apos;s make it real.
        </p>
        <a
          href={`mailto:${site.email}`}
          className="mt-10 inline-block rounded-lg bg-gradient-ember px-8 py-4 text-sm font-semibold text-ember-foreground shadow-ember transition-transform hover:scale-[1.03]"
        >
          {site.email}
        </a>
      </div>
    </section>
  );
}
