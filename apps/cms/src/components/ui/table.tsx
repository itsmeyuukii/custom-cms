import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";

export function Table({
  className,
  ...props
}: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="overflow-x-auto">
      <table
        className={clsx("w-full text-left text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function TableHead(props: ComponentPropsWithoutRef<"thead">) {
  return <thead {...props} />;
}

export function TableBody(props: ComponentPropsWithoutRef<"tbody">) {
  return <tbody {...props} />;
}

export function TableRow({
  header = false,
  className,
  ...props
}: ComponentPropsWithoutRef<"tr"> & { header?: boolean }) {
  return (
    <tr
      className={clsx(
        "border-b",
        header ? "border-zinc-200 text-zinc-500" : "border-zinc-100",
        className,
      )}
      {...props}
    />
  );
}

export function TableHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"th">) {
  return <th className={clsx("py-2 pr-4 font-medium", className)} {...props} />;
}

export function TableCell({
  className,
  ...props
}: ComponentPropsWithoutRef<"td">) {
  return <td className={clsx("py-2 pr-4", className)} {...props} />;
}
