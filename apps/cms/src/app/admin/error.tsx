"use client";

// Fallback for unexpected admin errors (docs/FORM_ERRORS_PLAN.md phase 4):
// expected ones are shown on their form instead. Production hides the
// real message, so this shows the digest to match against server logs.

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold text-zinc-900">
        Something went wrong
      </h1>
      <Text className="mt-2">
        That action couldn&apos;t be completed. Try again, or reload the page if
        it keeps happening.
      </Text>
      {error.digest && (
        <Text className="mt-2 text-zinc-400">
          Reference: <code>{error.digest}</code>
        </Text>
      )}
      <Button className="mt-6" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}
