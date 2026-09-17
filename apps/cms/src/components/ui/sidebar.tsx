"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Link } from "./link";

export function Sidebar({ children }: { children: ReactNode }) {
  return <nav className="flex flex-col gap-4 p-4">{children}</nav>;
}

export function SidebarSection({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-1">{children}</div>;
}

export function SidebarItem({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={clsx(
        "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-zinc-100 text-zinc-900"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
      )}
    >
      {children}
    </Link>
  );
}
