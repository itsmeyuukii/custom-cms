import type { Project } from "@/lib/portfolio-data";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-ember/50">
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- placeholder images from arbitrary hosts, revisit once real image hosting is decided (see docs/PORTFOLIO_THEME_PLAN.md) */}
        <img
          src={project.image}
          alt={project.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-4 top-4 rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
          {project.category}
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-card-foreground transition-colors group-hover:text-ember">
            {project.title}
          </h3>
          <span className="shrink-0 text-xs text-muted-foreground">
            {project.year}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {project.description}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <ul className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground"
              >
                {tag}
              </li>
            ))}
          </ul>
          <div className="flex gap-3 text-xs font-medium">
            {project.repo && (
              <a
                href={project.repo}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground transition-colors hover:text-ember"
              >
                Code ↗
              </a>
            )}
            {project.demo && (
              <a
                href={project.demo}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground transition-colors hover:text-ember"
              >
                Live ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
