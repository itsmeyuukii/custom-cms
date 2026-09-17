import NextLink from "next/link";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

export const Link = forwardRef<
  HTMLAnchorElement,
  ComponentPropsWithoutRef<typeof NextLink>
>(function Link(props, ref) {
  return <NextLink {...props} ref={ref} />;
});
