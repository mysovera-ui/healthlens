// Shared validation/normalization for patient identity fields (full legal
// name, age, gender, Malaysian NRIC) that are read off the uploaded lab
// report by the AI extraction step (lib/ai/extract-markers.ts) and can also
// be hand-corrected by staff in the dashboard (app/dashboard/[id]/ai-actions.ts).
// Both paths funnel through these same functions so "empty or invalid input
// becomes null" behaves identically regardless of source — and null is what
// the PDF (lib/pdf/report-document.tsx) renders as a blank cell.

export function normalizeFullName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v || /^unknown$/i.test(v)) return null;
  if (v.length < 2 || v.length > 120) return null;
  if (!/[a-zA-Z]/.test(v)) return null;
  return v;
}

export function normalizeAge(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim();
  if (!str || /^unknown$/i.test(str)) return null;
  const match = str.match(/\d+/);
  if (!match) return null;
  const n = parseInt(match[0], 10);
  if (Number.isNaN(n) || n <= 0 || n > 120) return null;
  return n;
}

export function normalizeGender(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (/^m(ale)?$/.test(v)) return "Male";
  if (/^f(emale)?$/.test(v)) return "Female";
  return null;
}

// Malaysian NRIC: 12 digits, conventionally displayed as YYMMDD-PB-###G.
// Accepts digits with or without dashes/spaces; rejects anything that
// doesn't resolve to exactly 12 digits (treated as "invalid" -> blank).
export function normalizeNric(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (/^unknown$/i.test(raw.trim())) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length !== 12) return null;
  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 12)}`;
}

// For anywhere the NRIC is *displayed* (PDF cover page, patient details
// table) rather than stored/edited — shows only the last 4 digits, e.g.
// "850714-02-6693" -> "******-**-6693", matching how banks/hospitals in
// Malaysia commonly partially mask this number. Always run values through
// normalizeNric() first so the input is in the expected dashed 12-digit
// format; anything else is masked conservatively (only the last 4 characters
// shown) rather than left in the clear.
export function maskNric(nric: string | null | undefined): string | null {
  if (!nric) return null;
  if (/^\d{6}-\d{2}-\d{4}$/.test(nric)) {
    return `******-**-${nric.slice(-4)}`;
  }
  // Not the expected normalized shape — mask everything except the last 4
  // characters, preserving any dashes so the grouping is still readable.
  const visible = nric.slice(-4);
  const masked = nric
    .slice(0, -4)
    .split("")
    .map((c) => (c === "-" ? "-" : "*"))
    .join("");
  return `${masked}${visible}`;
}
