import clsx from "clsx";

type AvatarProps = {
  initials: string;
  className?: string;
};

export function Avatar({ initials, className }: AvatarProps) {
  return (
    <span
      className={clsx(
        "inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white",
        className,
      )}
    >
      {initials}
    </span>
  );
}
