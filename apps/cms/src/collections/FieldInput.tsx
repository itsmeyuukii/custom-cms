// Renders one form control per FieldType (docs/COLLECTIONS_PLAN.md §4
// phase 5). `array`/`blocks` render as raw JSON textareas rather than a
// dynamic add/remove UI — matching the project's existing precedent of
// entering Block data as raw JSON (see src/app/admin/pages/[id]/page.tsx)
// until a real visual editor exists for either.

import type { Field } from "./types";

function titleCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

function toDateInputValue(value: unknown): string {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

const inputClass =
  "mt-1 w-full rounded border border-gray-300 px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500";
const monoInputClass = `${inputClass} font-mono text-xs`;

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

  return (
    <div>
      <label className="block text-sm font-medium">
        {label}
        {field.required && <span className="text-red-500"> *</span>}
      </label>
      <FieldControl
        field={field}
        defaultValue={defaultValue}
        disabled={disabled}
      />
    </div>
  );
}

function FieldControl({
  field,
  defaultValue,
  disabled,
}: {
  field: Field;
  defaultValue: unknown;
  disabled: boolean;
}) {
  switch (field.type) {
    case "text":
      return (
        <input
          type="text"
          name={field.name}
          defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
          required={field.required}
          disabled={disabled}
          className={inputClass}
        />
      );
    case "textarea":
    case "richText":
      return (
        <textarea
          name={field.name}
          defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
          required={field.required}
          disabled={disabled}
          rows={field.type === "richText" ? 8 : 3}
          className={inputClass}
        />
      );
    case "number":
      return (
        <input
          type="number"
          name={field.name}
          defaultValue={typeof defaultValue === "number" ? defaultValue : ""}
          required={field.required}
          disabled={disabled}
          min={field.min}
          max={field.max}
          className={inputClass}
        />
      );
    case "boolean":
      return (
        <input
          type="checkbox"
          name={field.name}
          defaultChecked={defaultValue === true}
          disabled={disabled}
          className="mt-1"
        />
      );
    case "date":
      return (
        <input
          type="date"
          name={field.name}
          defaultValue={toDateInputValue(defaultValue)}
          required={field.required}
          disabled={disabled}
          className={inputClass}
        />
      );
    case "select":
      if (field.many) {
        return (
          <select
            name={field.name}
            multiple
            defaultValue={
              Array.isArray(defaultValue) ? (defaultValue as string[]) : []
            }
            disabled={disabled}
            className={inputClass}
          >
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      }
      return (
        <select
          name={field.name}
          defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
          required={field.required}
          disabled={disabled}
          className={inputClass}
        >
          <option value="" disabled>
            Select…
          </option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case "relationship":
      if (field.many) {
        return (
          <textarea
            name={field.name}
            defaultValue={
              Array.isArray(defaultValue)
                ? (defaultValue as string[]).join("\n")
                : ""
            }
            placeholder={`One "${field.to}" document id per line`}
            disabled={disabled}
            rows={3}
            className={monoInputClass}
          />
        );
      }
      return (
        <input
          type="text"
          name={field.name}
          defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
          placeholder={`A "${field.to}" document id`}
          required={field.required}
          disabled={disabled}
          className={monoInputClass}
        />
      );
    case "upload":
      return (
        <input
          type="text"
          name={field.name}
          defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
          placeholder="A Media id"
          required={field.required}
          disabled={disabled}
          className={monoInputClass}
        />
      );
    case "array":
    case "blocks":
      return (
        <textarea
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
          className={monoInputClass}
        />
      );
    default: {
      const _exhaustive: never = field;
      throw new Error(`Unhandled field type: ${(_exhaustive as Field).type}`);
    }
  }
}
