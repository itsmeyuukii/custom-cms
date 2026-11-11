// Validates the data inside a collection's `blocks` fields against each
// block's Component schema (docs/BLOCK_VALIDATION_PLAN.md §3). Zod (in
// validation.ts) only checks the `{ component, data }` shape; this needs
// a database lookup per component, so it runs as a separate async step.
//
// Kept out of actions.ts on purpose: every export of a "use server" file
// becomes a callable server action endpoint.

import { assertValidBlock } from "@/lib/block-validation";
import { UserError } from "@/lib/form-errors";
import type { CollectionConfig, Field } from "./types";

type BlockItem = { component: string; data: unknown };

async function checkFields(
  fields: Field[],
  values: Record<string, unknown>,
  path: string,
) {
  for (const field of fields) {
    const value = values[field.name];
    if (!Array.isArray(value)) continue;
    const fieldPath = `${path}${field.name}`;

    if (field.type === "blocks") {
      for (const [index, item] of (value as BlockItem[]).entries()) {
        try {
          await assertValidBlock({ key: item.component }, item.data);
        } catch (error) {
          // Only the editor's own mistakes get the path added and stay
          // showable; anything else (a database failure) passes through.
          if (!(error instanceof UserError)) throw error;
          throw new UserError(`${fieldPath}.${index}: ${error.message}`);
        }
      }
    } else if (field.type === "array") {
      for (const [index, item] of value.entries()) {
        await checkFields(
          field.fields,
          item as Record<string, unknown>,
          `${fieldPath}.${index}.`,
        );
      }
    }
  }
}

/**
 * Throws if any block in `data` (already shape-checked by
 * collectionToZod) has an unknown component or data that doesn't match
 * that component's schema.
 */
export async function assertValidBlocks(
  config: CollectionConfig,
  data: Record<string, unknown>,
): Promise<void> {
  await checkFields(config.fields, data, "");
}
