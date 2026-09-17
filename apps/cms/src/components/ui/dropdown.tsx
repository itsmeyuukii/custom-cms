"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import type { ReactNode } from "react";

export function Dropdown({
  button,
  children,
}: {
  button: ReactNode;
  children: ReactNode;
}) {
  return (
    <Menu as="div" className="relative">
      <MenuButton className="flex items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
        {button}
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        className="z-10 mt-2 w-48 origin-top-right rounded-lg bg-white py-1 shadow-lg ring-1 ring-zinc-950/5 focus:outline-none"
      >
        {children}
      </MenuItems>
    </Menu>
  );
}

export function DropdownItem({ children }: { children: ReactNode }) {
  return <MenuItem>{children}</MenuItem>;
}
