import type { ComponentType } from "react";
import { Hero } from "./Hero";
import { CardGrid } from "./CardGrid";

// Maps a Component.key (from the database) to the React component that
// renders it. Add new block components here as they're built.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const blockRegistry: Record<string, ComponentType<any>> = {
  hero: Hero,
  "card-grid": CardGrid,
};
