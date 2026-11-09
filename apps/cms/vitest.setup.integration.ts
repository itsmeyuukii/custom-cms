// Global setup for the `integration` project (docs/UNIT_TESTING_PLAN.md
// §4). src/lib/prisma.ts connects to whatever DATABASE_URL says, and the
// local .env points at the dev database, so refuse to run anywhere but a
// database whose name ends in _test.
export default function setup() {
  const url = process.env.DATABASE_URL;
  const name = url ? new URL(url).pathname.slice(1) : undefined;
  if (!name?.endsWith("_test")) {
    throw new Error(
      `Integration tests need DATABASE_URL pointing at a *_test database (got "${name ?? "unset"}").`,
    );
  }
}
