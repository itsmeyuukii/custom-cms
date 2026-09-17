import clsx from "clsx";
import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, rows = 4, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
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
  },
);
