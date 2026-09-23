import { site, stats } from "@/lib/portfolio-data";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* ember glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl bg-gradient-ember"
      />
      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-24 sm:pt-32">
        <div className="max-w-3xl rise-in">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ember">
            {site.role} — {site.location}
          </p>
          <h1 className="mt-6 text-5xl font-bold leading-[1.05] text-foreground sm:text-7xl text-balance">
            {site.tagline}
          </h1>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="#work"
              className="rounded-lg bg-gradient-ember px-6 py-3 text-sm font-semibold text-ember-foreground shadow-ember transition-transform hover:scale-[1.03]"
            >
              View my work
            </a>
            <a
              href={`mailto:${site.email}`}
              className="rounded-lg border border-input px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              Get in touch
            </a>
          </div>
        </div>

        <dl className="mt-20 grid grid-cols-3 gap-6 border-t border-border pt-10 sm:max-w-xl">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="order-2 mt-1 block text-xs uppercase tracking-wider text-muted-foreground">
                {s.label}
              </dt>
              <dd className="order-1 font-display text-3xl font-bold text-foreground">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
