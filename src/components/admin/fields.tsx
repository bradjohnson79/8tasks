import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { COUNTRY_LABELS, SUPPORTED_COUNTRIES } from "@/lib/markets";

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TextField(props: {
  name: string;
  label: string;
  defaultValue?: string | null;
  hint?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  idPrefix?: string;
}) {
  const id = `${props.idPrefix ?? "f"}-${props.name}`;
  return (
    <Field label={props.label} htmlFor={id} hint={props.hint}>
      <Input
        id={id}
        name={props.name}
        type={props.type ?? "text"}
        defaultValue={props.defaultValue ?? ""}
        required={props.required}
        placeholder={props.placeholder}
      />
    </Field>
  );
}

export function TextAreaField(props: {
  name: string;
  label: string;
  defaultValue?: string | null;
  hint?: string;
  rows?: number;
}) {
  const id = `f-${props.name}`;
  return (
    <Field label={props.label} htmlFor={id} hint={props.hint}>
      <Textarea
        id={id}
        name={props.name}
        defaultValue={props.defaultValue ?? ""}
        rows={props.rows ?? 4}
      />
    </Field>
  );
}

export function SelectField(props: {
  name: string;
  label: string;
  defaultValue?: string | null;
  options: { value: string; label: string }[];
  hint?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const id = `f-${props.name}`;
  return (
    <Field label={props.label} htmlFor={id} hint={props.hint}>
      <NativeSelect
        id={id}
        name={props.name}
        defaultValue={props.defaultValue ?? ""}
        required={props.required}
      >
        {props.placeholder !== undefined && <option value="">{props.placeholder}</option>}
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </Field>
  );
}

export function CheckboxField({
  name,
  label,
  defaultChecked,
  hint,
  idPrefix,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  hint?: string;
  idPrefix?: string;
}) {
  const id = `${idPrefix ?? "f"}-${name}`;
  return (
    <div className="flex items-start gap-2">
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 accent-emerald-600"
      />
      <div>
        <Label htmlFor={id}>{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

/** Launch-market country checkboxes (Canada / US). */
export function CountriesField({ defaultValue }: { defaultValue?: string[] }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-medium">Countries</legend>
      <div className="flex flex-wrap gap-4">
        {SUPPORTED_COUNTRIES.map((c) => (
          <label key={c} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="countries"
              value={c}
              defaultChecked={defaultValue?.includes(c)}
              className="size-4 accent-emerald-600"
            />
            {COUNTRY_LABELS[c]}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Where members can join. 8Tasks currently lists Canada and US only.
      </p>
    </fieldset>
  );
}

export const STATUS_OPTIONS = [
  { value: "draft", label: "Draft (hidden)" },
  { value: "published", label: "Published (visible on site)" },
  { value: "archived", label: "Archived (hidden)" },
];

export const CAPABILITY_OPTIONS = [
  { value: "unknown", label: "Unknown" },
  { value: "yes", label: "Yes (confirmed)" },
  { value: "no", label: "No (confirmed)" },
];
