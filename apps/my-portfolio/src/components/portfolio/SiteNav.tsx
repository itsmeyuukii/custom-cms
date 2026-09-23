import { site } from "@/lib/portfolio-data";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a
          href="#"
          className="font-display text-lg font-bold tracking-tight text-foreground"
        >
          {site.name}
          <span className="text-ember">.</span>
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {site.links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <a
          href={`mailto:${site.email}`}
          className="rounded-lg bg-gradient-ember px-4 py-2 text-sm font-semibold text-ember-foreground transition-transform hover:scale-[1.03]"
        >
          Hire me
        </a>
      </div>
    </header>
  );
}
