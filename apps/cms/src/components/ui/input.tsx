import clsx from "clsx";
import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={clsx(
        "block w-full rounded-lg border-0 px-3 py-2 text-sm text-zinc-900 shadow-sm ring-1 ring-inset placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-inset disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500",
        invalid
          ? "ring-red-300 focus:ring-red-500"
          : "ring-zinc-300 focus:ring-indigo-500",
        className,
      )}
      {...props}
    />
  );
});
