// Expected form errors (docs/FORM_ERRORS_PLAN.md). Production builds hide
// thrown messages, so errors the editor caused are thrown as UserError
// and turned into a return value at the action boundary, where
// useActionState shows them. Anything else is rethrown untouched, so no
// internal message can reach the browser.

import { Prisma } from "@prisma/client";

/** An error caused by the editor's input, safe to show them as-is. */
export class UserError extends Error {}

export type FormState = { error: string | null };

/**
 * With @prisma/adapter-pg, a unique violation (P2002) carries no
 * `meta.target`; the field is only in the constraint name, e.g.
 * `Role_slug_key` or `Document_collection_slug_key` (last field wins).
 */
function uniqueViolationMessage(
  error: Prisma.PrismaClientKnownRequestError,
): string {
  const meta = error.meta as
    | {
        modelName?: string;
        driverAdapterError?: { cause?: { constraint?: { index?: string } } };
      }
    | undefined;
  const index = meta?.driverAdapterError?.cause?.constraint?.index;
  const model = meta?.modelName;
  if (!index || !model || !index.startsWith(`${model}_`)) {
    return "That value is already in use";
  }

  const fields = index
    .slice(model.length + 1)
    .replace(/_key$/, "")
    .split("_");
  return `That ${fields.at(-1)} is already in use`;
}

/**
 * Runs `fn` and turns a UserError (or a unique-constraint violation)
 * into `{ error }`. Anything else, including Next's redirect signal, is
 * rethrown.
 */
export async function toFormState(fn: () => Promise<void>): Promise<FormState> {
  try {
    await fn();
    return { error: null };
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: uniqueViolationMessage(error) };
    }
    throw error;
  }
}
