"use client";

// A form that shows its server action's expected error and keeps what
// the editor typed (docs/FORM_ERRORS_PLAN.md §2). The page around it
// stays a Server Component: its fields are passed in as children.

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import type { FormState } from "@/lib/form-errors";
import { ErrorMessage } from "./fieldset";

const initialState: FormState = { error: null };

export function ActionForm({
  action,
  resetOnSuccess = false,
  className,
  children,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  /** For "add" forms; edit forms keep their (now saved) values. */
  resetOnSuccess?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state !== initialState && state.error === null) {
      formRef.current?.reset();
    }
  }, [state, resetOnSuccess]);

  // JavaScript submits go through onSubmit: React resets a form after
  // every action it runs itself, which would wipe the editor's input
  // exactly when it was rejected, and preventDefault() stops React from
  // running it. `action` stays set for what it adds without JavaScript:
  // the progressive-enhancement fields a plain POST can submit.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      className={className}
    >
      {children}
      {state.error && (
        <ErrorMessage role="alert" className="mt-4">
          {state.error}
        </ErrorMessage>
      )}
    </form>
  );
}
