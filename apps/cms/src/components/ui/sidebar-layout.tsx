import type { ReactNode } from "react";

type SidebarLayoutProps = {
  navbar: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
};

export function SidebarLayout({
  navbar,
  sidebar,
  children,
}: SidebarLayoutProps) {
  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white lg:block">
        {sidebar}
      </aside>
      <div className="flex flex-1 flex-col">
        {navbar}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
