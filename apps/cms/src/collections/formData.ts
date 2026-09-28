// Converts a submitted admin form into the plain object
// createDocument/updateDocument validate (docs/COLLECTIONS_PLAN.md §4
// phase 5). This only does type coercion per FieldType, matching what
// FieldInput.tsx renders for that type — actual shape/required validation
// still happens in src/collections/validation.ts, not here.

import type { CollectionConfig, Field } from "./types";

function parseFieldValue(field: Field, formData: FormData): unknown {
  switch (field.type) {
    case "text":
    case "textarea":
    case "richText": {
      const value = formData.get(field.name);
      if (value === null) return undefined;
      const trimmed = String(value).trim();
      return trimmed === "" ? undefined : trimmed;
    }
    case "number": {
      const value = formData.get(field.name);
      if (value === null || String(value).trim() === "") return undefined;
      return Number(value);
    }
    case "boolean":
      return formData.get(field.name) === "on";
    case "date": {
      const value = formData.get(field.name);
      if (value === null || String(value).trim() === "") return undefined;
      return String(value);
    }
    case "select": {
      if (field.many) {
        const values = formData.getAll(field.name).map(String).filter(Boolean);
        return values.length === 0 ? undefined : values;
      }
      const value = formData.get(field.name);
      return value === null || value === "" ? undefined : String(value);
    }
    case "relationship": {
      if (field.many) {
        const raw = String(formData.get(field.name) ?? "");
        const ids = raw
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        return ids.length === 0 ? undefined : ids;
      }
      const value = formData.get(field.name);
      if (value === null) return undefined;
      const trimmed = String(value).trim();
      return trimmed === "" ? undefined : trimmed;
    }
    case "upload": {
      const value = formData.get(field.name);
      if (value === null) return undefined;
      const trimmed = String(value).trim();
      return trimmed === "" ? undefined : trimmed;
    }
    case "array":
    case "blocks": {
      const raw = String(formData.get(field.name) ?? "").trim();
      if (raw === "") return undefined;
      try {
        return JSON.parse(raw);
      } catch {
        throw new Error(`"${field.label ?? field.name}" must be valid JSON`);
      }
    }
    default: {
      const _exhaustive: never = field;
      throw new Error(`Unhandled field type: ${(_exhaustive as Field).type}`);
    }
  }
}

export function parseDocumentFormData(
  config: CollectionConfig,
  formData: FormData,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of config.fields) {
    const value = parseFieldValue(field, formData);
    if (value !== undefined) data[field.name] = value;
  }
  return data;
}
