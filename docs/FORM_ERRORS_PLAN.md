# Admin Form Errors — Design Plan

Goal: when an admin form is rejected (invalid block data, a duplicate
slug, a role change that would lock everyone out), the editor sees the
reason next to the form, and keeps what they typed.

**Status: design only, nothing implemented yet.**

## The problem

Every admin form posts to a server action that `throw`s on bad input.
In development the thrown message shows in Next's error overlay, so it
looked fine. Production builds replace thrown messages with a generic
screen ("This page couldn't load. A server error occurred." plus a
digest) so internals never leak. The data is protected, but the editor
gets no reason and loses their input. This was found while building
block validation ([BLOCK_VALIDATION_PLAN.md](BLOCK_VALIDATION_PLAN.md)),
and it applies to every form: "Title and slug are required", "Block
data must be valid JSON", the role/user lockout guards, unsupported
media types, collection validation.

Next's own guidance (bundled docs, "Handling expected errors") is to
treat expected errors as **return values**, shown with `useActionState`,
and to throw only for genuinely unexpected failures.

## Decisions

- **Expected errors are a `UserError`, converted to a return value at
  the action boundary.** Lower layers (`src/collections/actions.ts`,
  `src/lib/block-validation.ts`, the lockout guards) keep throwing, but
  throw `UserError` for anything the editor caused and can fix. One
  wrapper at each form's action turns a `UserError` into
  `{ error: message }`. Rewriting every layer to return result objects
  would touch far more code for the same outcome, and
  `createDocument`/`updateDocument` are meant to back a future write API
  as well, where throwing is the natural shape.
- **Only `UserError` messages reach the browser.** Everything else
  (`Forbidden`, Prisma failures, bugs) is rethrown and keeps hitting the
  error screen, so no internal message can leak by accident. The one
  translated exception: a Prisma unique-constraint violation (`P2002`)
  becomes "That slug is already in use", since a duplicate slug is the
  most common expected error and today surfaces as a raw Prisma error.
- **Inputs survive a rejected submit.** React 19 resets a `<form
action>` after every submission, which would wipe a long JSON block on
  a typo. The shared form submits through `onSubmit` + `startTransition`
  instead, which doesn't reset, and resets explicitly only on success
  for "add" forms. This gives up progressive enhancement (a submit
  without JavaScript), which the admin already depends on (login is a
  client component).
- **Button-only forms stay as they are** (set status, delete). They
  take no typed input; a failure there is a bug or a permission
  problem, which belongs on an error screen. A new `admin/error.tsx`
  makes that screen readable (phase 4).

## How this relates to what already exists

- Server actions change signature to `(prevState, formData)` (bound
  arguments still come first, e.g. `addBlock(pageId, prevState,
formData)`), as `useActionState` requires.
- Authorization is unchanged: `requirePermission` still runs first in
  every action and still throws a plain `Error`, which is rethrown.
- Page components stay Server Components. Only the form wrapper is a
  Client Component; the fields inside it are passed as children.
- Tests follow CLAUDE.md's test-first rule: unit tests for the wrapper,
  component tests for the form, Playwright for each converted form's
  error path.

## 1. `src/lib/form-errors.ts`

```ts
/** An error caused by the editor's input, safe to show them as-is. */
export class UserError extends Error {}

export type FormState = { error: string | null };
export const initialFormState: FormState = { error: null };

/**
 * Runs `fn` and turns a UserError (or a unique-constraint violation)
 * into `{ error }`. Anything else, including Next's redirect signal, is
 * rethrown.
 */
export async function toFormState(fn: () => Promise<void>): Promise<FormState>;
```

Each action body becomes `return toFormState(async () => { ... })`.
`redirect()` works unchanged inside it, because its signal is not a
`UserError` and is rethrown.

## 2. `src/components/ui/action-form.tsx`

```tsx
"use client";
export function ActionForm(props: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  resetOnSuccess?: boolean; // "add" forms; edit forms keep their values
  className?: string;
  children: React.ReactNode;
}): React.JSX.Element;
```

Wraps `useActionState`, renders the error with the existing
`ErrorMessage` (`role="alert"`, so screen readers announce it) after
the children, and disables nothing itself: the submit buttons stay
where each page puts them.

## 3. Forms converted

| Form                      | Action                                         | Expected errors                                             |
| ------------------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| New page                  | `createPage`                                   | missing title/slug, duplicate slug                          |
| Add block                 | `addBlock`                                     | invalid JSON, schema/size errors, unknown component         |
| New / edit collection doc | `createDocumentAction`, `updateDocumentAction` | field validation, invalid JSON, block errors, unique fields |
| New role / edit role      | `createRole`, `updateRole`                     | missing name/slug, duplicate slug, roles:manage lockout     |
| Edit user's roles         | `updateUserRoles`                              | users:manage / roles:manage lockout                         |
| Upload media              | `uploadMedia`                                  | no file, unsupported type, too large                        |

## 4. Phased build order

1. **Core:** `UserError`, `toFormState` (unit tests, including the
   redirect and `P2002` cases) and `ActionForm` (component tests: shows
   the error, keeps typed input on error, resets on success only when
   asked). No form uses them yet.
2. **Pages and collections:** the four content forms, with their lower
   layers throwing `UserError`. Playwright: the invalid-block test now
   checks the message and that the JSON is still in the textarea; a
   duplicate page slug shows "That slug is already in use".
3. **Roles, users, media:** the remaining four forms. Playwright: the
   media unsupported-type test checks the message; a role save that
   would lock everyone out shows the lockout message.
4. **Fallback + docs:** `src/app/admin/error.tsx` for uncaught errors (a
   readable message, the digest, and a "Try again" button), then mark
   the PROJECT_PLAN §4 gap closed.

## Open questions

- **Field-level errors:** this puts one message per form. Collection
  validation already produces per-field paths (`title: ...`), so a
  later step could return `{ fieldErrors }` and show each next to its
  input. Not needed to fix the actual problem.
- **Login page:** already a client component with its own error
  handling via `signIn`. Unchanged.
