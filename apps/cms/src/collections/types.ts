// Collection & field config shape (docs/COLLECTIONS_PLAN.md §2). This is
// the core design surface everything else (Document validation, admin
// forms, the public API) reads — defined here with no runtime behavior
// yet; later phases build on top of it.

export type FieldType =
  | "text"
  | "textarea"
  | "richText"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "relationship"
  | "upload"
  | "array"
  | "blocks"; // reuses the existing Component/Block registry

interface BaseField {
  name: string; // key inside Document.data
  label?: string; // defaults to a title-cased `name`
  required?: boolean;
  unique?: boolean; // enforced in app code (e.g. slug fields)
}

export interface TextField extends BaseField {
  type: "text" | "textarea" | "richText";
  minLength?: number;
  maxLength?: number;
}

export interface NumberField extends BaseField {
  type: "number";
  min?: number;
  max?: number;
}

export interface BooleanField extends BaseField {
  type: "boolean";
}

export interface DateField extends BaseField {
  type: "date";
}

export interface SelectField extends BaseField {
  type: "select";
  options: { label: string; value: string }[];
  many?: boolean;
}

export interface RelationshipField extends BaseField {
  type: "relationship";
  to: string; // another collection's slug
  many?: boolean;
}

export interface UploadField extends BaseField {
  type: "upload"; // references an existing Media row by id
}

export interface ArrayField extends BaseField {
  type: "array";
  fields: Field[]; // repeatable group of sub-fields
}

export interface BlocksField extends BaseField {
  type: "blocks";
  allow?: string[]; // Component keys allowed here; omit = allow any registered component
}

export type Field =
  | TextField
  | NumberField
  | BooleanField
  | DateField
  | SelectField
  | RelationshipField
  | UploadField
  | ArrayField
  | BlocksField;

export interface CollectionConfig {
  slug: string; // e.g. "posts" — matches Document.collection
  label: string;
  labelPlural?: string;
  fields: Field[];
  slugField?: string; // which field (if any) maps to Document.slug
  access?: {
    // Permission keys, same taxonomy as everything else (docs/RBAC_PLAN.md
    // §2) — checked via requirePermission/hasPermission, no separate access
    // system. "public" for read means no auth check, matching how the
    // existing Pages/Posts REST API treats published content.
    read?: "public" | string[];
    create?: string[];
    update?: string[];
    delete?: string[];
  };
}
