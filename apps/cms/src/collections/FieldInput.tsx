// Renders one form control per FieldType (docs/COLLECTIONS_PLAN.md §4
// phase 5), built on the shared UI kit in src/components/ui/. `array`/
// `blocks` render as raw JSON textareas rather than a dynamic add/remove
// UI, matching the project's existing precedent of entering Block data as
// raw JSON (see src/app/admin/pages/[id]/page.tsx) until a real visual
// editor exists for either.

import type { Field } from "./types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Checkbox, CheckboxField } from "@/components/ui/checkbox";
import { Field as FormField, Label } from "@/components/ui/fieldset";

function titleCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

function toDateInputValue(value: unknown): string {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

const monoClass = "font-mono text-xs";

export function FieldInput({
  field,
  defaultValue,
  disabled = false,
}: {
  field: Field;
  defaultValue?: unknown;
  disabled?: boolean;
}) {
  const label = field.label ?? titleCase(field.name);

  if (field.type === "boolean") {
    return (
      <CheckboxField>
        <Checkbox
          name={field.name}
          defaultChecked={defaultValue === true}
          disabled={disabled}
        />
        {label}
      </CheckboxField>
    );
  }

  return (
    <FormField>
      <Label htmlFor={field.name}>
        {label}
        {field.required && <span className="text-red-500"> *</span>}
      </Label>
      <FieldControl
        field={field}
        defaultValue={defaultValue}
        disabled={disabled}
      />
    </FormField>
  );
}

function FieldControl({
  field,
  defaultValue,
  disabled,
}: {
  field: Exclude<Field, { type: "boolean" }>;
  defaultValue: unknown;
  disabled: boolean;
}) {
  switch (field.type) {
    case "text":
      return (
        <Input
          id={field.name}
          type="text"
          name={field.name}
          defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
          required={field.required}
          disabled={disabled}
        />
      );
    case "textarea":
    case "richText":
      return (
        <Textarea
          id={field.name}
          name={field.name}
          defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
          required={field.required}
          disabled={disabled}
          rows={field.type === "richText" ? 8 : 3}
        />
      );
    case "number":
      return (
        <Input
          id={field.name}
          type="number"
          name={field.name}
          defaultValue={typeof defaultValue === "number" ? defaultValue : ""}
          required={field.required}
          disabled={disabled}
          min={field.min}
          max={field.max}
        />
      );
    case "date":
      return (
        <Input
          id={field.name}
          type="date"
          name={field.name}
          defaultValue={toDateInputValue(defaultValue)}
          required={field.required}
          disabled={disabled}
        />
      );
    case "select":
      if (field.many) {
        return (
          <Select
            id={field.name}
            name={field.name}
            multiple
            defaultValue={
              Array.isArray(defaultValue) ? (defaultValue as string[]) : []
            }
            disabled={disabled}
          >
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        );
      }
      return (
        <Select
          id={field.name}
          name={field.name}
          defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
          required={field.required}
          disabled={disabled}
        >
          <option value="" disabled>
            Select…
          </option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );
    case "relationship":
      if (field.many) {
        return (
          <Textarea
            id={field.name}
            name={field.name}
            defaultValue={
              Array.isArray(defaultValue)
                ? (defaultValue as string[]).join("\n")
                : ""
            }
            placeholder={`One "${field.to}" document id per line`}
            disabled={disabled}
            rows={3}
            className={monoClass}
          />
        );
      }
      return (
        <Input
          id={field.name}
          type="text"
          name={field.name}
          defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
          placeholder={`A "${field.to}" document id`}
          required={field.required}
          disabled={disabled}
          className={monoClass}
        />
      );
    case "upload":
      return (
        <Input
          id={field.name}
          type="text"
          name={field.name}
          defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
          placeholder="A Media id"
          required={field.required}
          disabled={disabled}
          className={monoClass}
        />
      );
    case "array":
    case "blocks":
      return (
        <Textarea
          id={field.name}
          name={field.name}
          defaultValue={
            defaultValue !== undefined
              ? JSON.stringify(defaultValue, null, 2)
              : ""
          }
          placeholder={
            field.type === "array"
              ? "[]"
              : '[{ "component": "hero", "data": {} }]'
          }
          disabled={disabled}
          rows={6}
          className={monoClass}
        />
      );
    default: {
      const _exhaustive: never = field;
      throw new Error(`Unhandled field type: ${(_exhaustive as Field).type}`);
    }
  }
}
