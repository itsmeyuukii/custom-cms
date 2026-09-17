"use client";

import { logoutAction } from "@/app/admin/actions";
import { Avatar } from "./avatar";
import { Dropdown, DropdownItem } from "./dropdown";

type NavbarProps = {
  userName?: string | null;
};

function initialsFor(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function Navbar({ userName }: NavbarProps) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-end border-b border-zinc-200 bg-white px-4">
      <Dropdown button={<Avatar initials={initialsFor(userName)} />}>
        <DropdownItem>
          <button
            type="button"
            onClick={() => logoutAction()}
            className="block w-full px-3 py-1.5 text-left text-sm text-zinc-700 data-focus:bg-zinc-50"
          >
            Sign out
          </button>
        </DropdownItem>
      </Dropdown>
    </div>
  );
}
