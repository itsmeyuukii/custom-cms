// Config → Zod validator generator (docs/COLLECTIONS_PLAN.md §3). Postgres
// doesn't enforce anything about the shape of Document.data — every write
// goes through the schema built here from the collection's field config
// instead of a hand-written validator per collection.
//
// `unique` is not checked here — it needs a DB lookup against existing
// Documents, done at write time (phase 4), not structural validation.

import { z } from "zod";
import type { CollectionConfig, Field } from "./types";

function fieldToZod(field: Field): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case "text":
    case "textarea":
    case "richText": {
      let str = z.string();
      if (field.minLength !== undefined) str = str.min(field.minLength);
      if (field.maxLength !== undefined) str = str.max(field.maxLength);
      if (field.required && field.minLength === undefined) str = str.min(1);
      schema = str;
      break;
    }
    case "number": {
      let num = z.number();
      if (field.min !== undefined) num = num.min(field.min);
      if (field.max !== undefined) num = num.max(field.max);
      schema = num;
      break;
    }
    case "boolean":
      schema = z.boolean();
      break;
    case "date":
      schema = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
        message: "Invalid date",
      });
      break;
    case "select": {
      const values = field.options.map((o) => o.value);
      const option = z.string().refine((v) => values.includes(v), {
        message: `Must be one of: ${values.join(", ")}`,
      });
      schema = field.many ? z.array(option) : option;
      break;
    }
    case "relationship": {
      const id = z.string();
      schema = field.many ? z.array(id) : id;
      break;
    }
    case "upload":
      schema = z.string(); // a Media row's id
      break;
    case "array":
      schema = z.array(fieldsToZodObject(field.fields));
      break;
    case "blocks": {
      const allow = field.allow;
      const component = allow
        ? z.string().refine((v) => allow.includes(v), {
            message: `Component must be one of: ${allow.join(", ")}`,
          })
        : z.string();
      schema = z.array(z.object({ component, data: z.unknown() }));
      break;
    }
    default: {
      const _exhaustive: never = field;
      throw new Error(`Unhandled field type: ${(_exhaustive as Field).type}`);
    }
  }

  return field.required ? schema : schema.optional();
}

function fieldsToZodObject(fields: Field[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.name] = fieldToZod(field);
  }
  return z.object(shape);
}

/** Builds the Zod schema that every write to a collection's Documents validates against. */
export function collectionToZod(config: CollectionConfig) {
  return fieldsToZodObject(config.fields);
}
