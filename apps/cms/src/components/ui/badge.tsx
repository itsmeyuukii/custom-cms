import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";

const colors = {
  zinc: "bg-zinc-100 text-zinc-700",
  green: "bg-green-100 text-green-700",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-700",
  indigo: "bg-indigo-100 text-indigo-700",
} as const;

type BadgeColor = keyof typeof colors;

type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  color?: BadgeColor;
};

export function Badge({ color = "zinc", className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
        colors[color],
        className,
      )}
      {...props}
    />
  );
}
