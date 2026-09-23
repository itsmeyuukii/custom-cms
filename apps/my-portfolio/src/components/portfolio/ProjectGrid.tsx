import { projects } from "@/lib/portfolio-data";
import { ProjectCard } from "./ProjectCard";
import { SectionHeading } from "./SectionHeading";

export function ProjectGrid() {
  const featured = projects.find((p) => p.featured);
  const rest = projects.filter((p) => !p.featured);

  return (
    <section id="work" className="mx-auto max-w-6xl px-6 py-24">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="Engineering Projects"
          title="Software I've designed and shipped."
          description="Real systems with real constraints — each one built to solve a problem worth solving."
        />
        <a
          href="#contact"
          className="text-sm font-medium text-ember transition-colors hover:text-foreground"
        >
          Start a project →
        </a>
      </div>

      {featured && (
        <div className="group mt-12 grid overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden md:aspect-auto">
            {/* eslint-disable-next-line @next/next/no-img-element -- placeholder images from arbitrary hosts, revisit once real image hosting is decided (see docs/PORTFOLIO_THEME_PLAN.md) */}
            <img
              src={featured.image}
              alt={featured.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col justify-center p-8 md:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ember">
              Featured — {featured.category}
            </p>
            <h3 className="mt-4 font-display text-3xl font-bold text-card-foreground">
              {featured.title}
            </h3>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {featured.description}
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {featured.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground"
                >
                  {tag}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex gap-4 text-sm font-medium">
              {featured.repo && (
                <a
                  href={featured.repo}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ember transition-colors hover:text-foreground"
                >
                  View code ↗
                </a>
              )}
              {featured.demo && (
                <a
                  href={featured.demo}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ember transition-colors hover:text-foreground"
                >
                  Live demo ↗
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </div>
    </section>
  );
}
