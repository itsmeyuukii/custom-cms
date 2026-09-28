// Collection registry (docs/COLLECTIONS_PLAN.md §2) — mirrors the pattern
// src/components/blocks/registry.tsx already uses for Components: a config
// object registers itself here by its slug, and the generic actions/admin
// UI/API all look collections up through this map rather than importing a
// specific collection by name. Empty until phase 6 migrates Post to be the
// first real collection.

import type { CollectionConfig } from "./types";

export const collectionRegistry: Record<string, CollectionConfig> = {};

export function getCollectionConfig(slug: string): CollectionConfig {
  const config = collectionRegistry[slug];
  if (!config) throw new Error(`Unknown collection: "${slug}"`);
  return config;
}
