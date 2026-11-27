import { inputClass, labelClass } from "@/components/app/public-form";
import type { EmailPrefs } from "@/lib/email/prefs";
import { COMPENSATION_CHOICES, EQUIPMENT, FREQUENCIES } from "@/lib/email/prefs";
import { REGIONS } from "@/lib/taxonomy";
import { TimeZoneInput } from "./time-zone-input";

type Opt = { value: string; label: string };

function CheckGroup({
  legend,
  name,
  options,
  checked = [],
}: {
  legend: string;
  name: string;
  options: readonly Opt[];
  checked?: string[];
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={`${labelClass} mb-1`}>{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex min-h-11 items-center gap-3 rounded-xl border bg-surface px-3 text-sm"
          >
            <input
              type="checkbox"
              name={name}
              value={o.value}
              defaultChecked={checked.includes(o.value)}
              className="size-4"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Shared My Daily 8 preference fields (sign-up and manage preferences). All optional. */
export function PrefsFields({
  categories,
  subsections,
  defaults,
  showFrequency = true,
}: {
  categories: Opt[];
  subsections: Opt[];
  defaults?: Partial<EmailPrefs>;
  /** Account preferences reuse these fields without the email frequency. */
  showFrequency?: boolean;
}) {
  const d = defaults ?? {};
  return (
    <>
      {showFrequency && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="p-frequency" className={labelClass}>
            How often
          </label>
          <select
            id="p-frequency"
            name="frequency"
            defaultValue={d.frequency ?? "daily"}
            className={inputClass}
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-2">
            Sent around 8 AM your time, only when we have verified picks.
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="p-country" className={labelClass}>
            Country
          </label>
          <select
            id="p-country"
            name="country"
            defaultValue={d.country ?? ""}
            className={inputClass}
          >
            <option value="">Canada or US</option>
            <option value="CA">Canada</option>
            <option value="US">United States</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="p-region" className={labelClass}>
            Province / state
          </label>
          <select id="p-region" name="region" defaultValue={d.region ?? ""} className={inputClass}>
            <option value="">Any</option>
            <optgroup label="Canada">
              {REGIONS.CA.map((r) => (
                <option key={`CA-${r.code}`} value={r.code}>
                  {r.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="United States">
              {REGIONS.US.map((r) => (
                <option key={`US-${r.code}`} value={r.code}>
                  {r.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="p-city" className={labelClass}>
            City <span className="font-normal text-text-2">(optional)</span>
          </label>
          <input
            id="p-city"
            name="city"
            maxLength={80}
            defaultValue={d.city ?? ""}
            className={inputClass}
          />
        </div>
      </div>
      <CheckGroup
        legend="Categories you like"
        name="categories"
        options={categories}
        checked={d.categories}
      />
      <CheckGroup
        legend="Creative interests"
        name="creativeInterests"
        options={subsections}
        checked={d.creativeInterests}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="p-workMode" className={labelClass}>
            Remote or local
          </label>
          <select
            id="p-workMode"
            name="workMode"
            defaultValue={d.workMode ?? "any"}
            className={inputClass}
          >
            <option value="any">Either</option>
            <option value="remote">From home only</option>
            <option value="local">Local, in person</option>
          </select>
        </div>
        <label className="flex min-h-11 items-center gap-3 self-end rounded-xl border bg-surface px-3 text-sm">
          <input
            type="checkbox"
            name="beginnerOnly"
            defaultChecked={d.beginnerOnly}
            className="size-4"
          />
          Beginner-friendly only
        </label>
      </div>
      <CheckGroup
        legend="Equipment you have"
        name="equipment"
        options={EQUIPMENT}
        checked={d.equipment}
      />
      <CheckGroup
        legend="Pay types (leave empty for all)"
        name="compensationTypes"
        options={COMPENSATION_CHOICES}
        checked={d.compensationTypes}
      />
      <TimeZoneInput defaultValue={d.timeZone} />
    </>
  );
}
