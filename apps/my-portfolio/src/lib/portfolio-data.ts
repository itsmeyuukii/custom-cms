// Placeholder portfolio content. Swap these values for your own, or wire this
// module to a backend later — every component on the page reads from here.

export const site = {
  name: "Gerard Yabut",
  role: "Software Engineer",
  tagline:
    "I design and build software that solves real problems — from backend systems to polished products.",
  location: "Shanghai, China",
  email: "hello@example.com",
  links: [
    { label: "Work", href: "#work" },
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" },
  ],
  socials: [
    { label: "GitHub", href: "https://github.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
    { label: "Dribbble", href: "https://dribbble.com" },
  ],
};

export type Project = {
  title: string;
  category: string;
  year: string;
  description: string;
  image: string;
  tags: string[];
  repo?: string;
  demo?: string;
  featured?: boolean;
};

export const projects: Project[] = [
  {
    title: "Ember Analytics",
    category: "Full-Stack App",
    year: "2026",
    description:
      "Real-time analytics platform — event ingestion pipeline, streaming dashboards, and sub-second queries over millions of rows.",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    tags: ["TypeScript", "React", "PostgreSQL", "WebSockets"],
    repo: "https://github.com",
    demo: "https://example.com",
    featured: true,
  },
  {
    title: "Forge Commerce API",
    category: "Backend System",
    year: "2025",
    description:
      "Headless commerce backend with inventory, payments, and webhook-driven order orchestration. 99.9% uptime in production.",
    image:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
    tags: ["Node.js", "REST", "Stripe", "Docker"],
    repo: "https://github.com",
  },
  {
    title: "Atlas Travel Journal",
    category: "Mobile-First PWA",
    year: "2025",
    description:
      "Offline-first journaling app with map rendering, background sync, and conflict resolution across devices.",
    image:
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
    tags: ["React", "PWA", "IndexedDB", "Mapbox"],
    repo: "https://github.com",
    demo: "https://example.com",
  },
  {
    title: "Night Signals",
    category: "Creative Coding",
    year: "2024",
    description:
      "Generative art engine that transforms live city noise data into large-format prints via a custom render pipeline.",
    image:
      "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1200&q=80",
    tags: ["WebGL", "GLSL", "Data Viz"],
    repo: "https://github.com",
  },
  {
    title: "Deploy Doctor",
    category: "Dev Tool",
    year: "2024",
    description:
      "CLI that diagnoses failed CI/CD pipelines — parses logs, detects common misconfigurations, and suggests fixes.",
    image:
      "https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=1200&q=80",
    tags: ["Go", "CLI", "CI/CD"],
    repo: "https://github.com",
  },
  {
    title: "Kiln Queue",
    category: "Infrastructure",
    year: "2023",
    description:
      "Lightweight job queue with retries, scheduling, and a monitoring UI — built to replace an over-provisioned broker.",
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
    tags: ["Redis", "TypeScript", "Observability"],
    repo: "https://github.com",
  },
];

export const services = [
  {
    title: "Full-Stack Development",
    description:
      "End-to-end web applications — from database schema to deployment, with clean APIs and tested code.",
  },
  {
    title: "System Design",
    description:
      "Architecture that scales: queues, caching, observability, and trade-offs made deliberately.",
  },
  {
    title: "Product Engineering",
    description:
      "Shipping user-facing features fast without sacrificing craft — performance and polish included.",
  },
];

export const stats = [
  { value: "6+", label: "Years of practice" },
  { value: "40+", label: "Projects shipped" },
  { value: "12", label: "Happy clients" },
];

export const about = {
  heading: "Software built with intent.",
  body: "I'm a software engineer based in Shanghai. I care about the details most people never notice — a clean abstraction, a fast query, a failure mode handled before it happens. My work sits at the intersection of solid engineering and thoughtful product design.",
  image:
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
};
