// Block data validation (docs/BLOCK_VALIDATION_PLAN.md, SECURITY_REVIEW
// #3). Block data is spread straight into a component's props, so it's
// checked against the component's JSON Schema, treated as closed, before
// it's ever written. Shared by page blocks and collection `blocks` fields.

import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";

export const MAX_BLOCK_DATA_BYTES = 64 * 1024;

export type BlockValidationResult =
  { ok: true } | { ok: false; message: string };

// Strict mode rejects unknown keywords, so a typo in a component schema
// fails loudly instead of silently validating nothing.
const ajv = new Ajv({ allErrors: true, strict: true });

// Compiling is the expensive part, and component schemas rarely change.
const compiled = new Map<string, ValidateFunction>();

type SchemaObject = Record<string, unknown>;

function isSchemaObject(value: unknown): value is SchemaObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Returns a copy where every object schema without its own
 * `additionalProperties` gets `additionalProperties: false`, so only
 * declared props get through. A schema can still opt out explicitly.
 */
export function closeSchema(schema: unknown): unknown {
  if (!isSchemaObject(schema)) return schema;

  const closed: SchemaObject = { ...schema };

  if (isSchemaObject(schema.properties)) {
    closed.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([name, sub]) => [
        name,
        closeSchema(sub),
      ]),
    );
  }
  if (schema.items !== undefined) {
    closed.items = Array.isArray(schema.items)
      ? schema.items.map(closeSchema)
      : closeSchema(schema.items);
  }
  for (const key of ["allOf", "anyOf", "oneOf"] as const) {
    const branches = schema[key];
    if (Array.isArray(branches)) closed[key] = branches.map(closeSchema);
  }

  const isObjectSchema =
    schema.type === "object" || isSchemaObject(schema.properties);
  if (isObjectSchema && !("additionalProperties" in schema)) {
    closed.additionalProperties = false;
  }

  return closed;
}

function validatorFor(schema: unknown): ValidateFunction {
  const key = JSON.stringify(schema);
  let validate = compiled.get(key);
  if (!validate) {
    validate = ajv.compile(closeSchema(schema) as SchemaObject);
    compiled.set(key, validate);
  }
  return validate;
}

/** `/cards/0/title` → `cards.0.title`, matching the collection errors. */
function describeError(error: ErrorObject): string {
  const path = error.instancePath.slice(1).replaceAll("/", ".");
  if (error.keyword === "additionalProperties") {
    const prop = String(error.params.additionalProperty);
    return `${path ? `${path}.` : ""}${prop}: is not an allowed property`;
  }
  return `${path || "(root)"}: ${error.message}`;
}

/** Checks size, then `data` against the (closed) component schema. */
export function validateBlockData(
  schema: unknown,
  data: unknown,
): BlockValidationResult {
  const bytes = Buffer.byteLength(JSON.stringify(data) ?? "");
  if (bytes > MAX_BLOCK_DATA_BYTES) {
    return {
      ok: false,
      message: `Block data is too large (max ${MAX_BLOCK_DATA_BYTES / 1024} KB)`,
    };
  }

  const validate = validatorFor(schema);
  if (validate(data)) return { ok: true };

  const message = (validate.errors ?? []).map(describeError).sort().join("; ");
  return { ok: false, message };
}
