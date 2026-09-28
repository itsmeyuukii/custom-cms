import clsx from "clsx";
import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

type CheckboxProps = InputHTMLAttributes<HTMLInputElement>;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={clsx(
          "h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
          className,
        )}
        {...props}
      />
    );
  },
);

export function CheckboxField({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={clsx(
        "flex items-center gap-2 text-sm text-zinc-900",
        className,
      )}
    >
      {children}
    </label>
  );
}
