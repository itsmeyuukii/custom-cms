import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";

export function FieldGroup({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={clsx("space-y-6", className)} {...props} />;
}

export function Field({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={clsx("space-y-1.5", className)} {...props} />;
}

export function Label({
  className,
  ...props
}: ComponentPropsWithoutRef<"label">) {
  return (
    <label
      className={clsx("block text-sm font-medium text-zinc-900", className)}
      {...props}
    />
  );
}

export function Description({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return <p className={clsx("text-sm text-zinc-500", className)} {...props} />;
}

export function ErrorMessage({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return <p className={clsx("text-sm text-red-600", className)} {...props} />;
}
