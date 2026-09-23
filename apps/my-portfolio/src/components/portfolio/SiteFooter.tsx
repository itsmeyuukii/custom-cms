import { site } from "@/lib/portfolio-data";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} {site.name}. All rights reserved.
        </p>
        <ul className="flex items-center gap-6">
          {site.socials.map((social) => (
            <li key={social.label}>
              <a
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-muted-foreground transition-colors hover:text-ember"
              >
                {social.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
