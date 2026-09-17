import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";
import { Link } from "./link";

export function Text({ className, ...props }: ComponentPropsWithoutRef<"p">) {
  return <p className={clsx("text-sm text-zinc-600", className)} {...props} />;
}

export function TextLink({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link
      className={clsx(
        "font-medium text-indigo-600 hover:text-indigo-500",
        className,
      )}
      {...props}
    />
  );
}
