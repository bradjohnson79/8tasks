"use client";

import { useEffect, useState } from "react";

/** Fills the browser's IANA time zone so emails arrive at 8 AM local time. */
export function TimeZoneInput({ defaultValue }: { defaultValue?: string }) {
  const [tz, setTz] = useState(defaultValue ?? "America/Vancouver");
  useEffect(() => {
    if (defaultValue) return;
    try {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Vancouver");
    } catch {
      // keep default
    }
  }, [defaultValue]);
  return <input type="hidden" name="timeZone" value={tz} />;
}
