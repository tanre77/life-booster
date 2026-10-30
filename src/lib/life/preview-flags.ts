/**
 * Preview mode switches. Journal text does not live here.
 * Both the env flag and `?preview=1` are required.
 */

const ON = new Set(["1", "true", "yes", "on"]);

export function previewFlagOn(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value !== "string") return false;
  return ON.has(value.trim().toLowerCase());
}

export type PreviewFlagSource = {
  LIFE_BOOSTER_PREVIEW?: string;
  VITE_LIFE_BOOSTER_PREVIEW?: string;
  /** Parsed `preview` search value, when the router has already decoded it. */
  preview?: unknown;
  /** Raw query or a full href. `preview=1` (also true / yes / on) is the query half. */
  search?: string;
};

export function isPreviewEnvEnabled(source: PreviewFlagSource): boolean {
  return (
    previewFlagOn(source.LIFE_BOOSTER_PREVIEW) || previewFlagOn(source.VITE_LIFE_BOOSTER_PREVIEW)
  );
}

export function isPreviewQueryEnabled(source: PreviewFlagSource): boolean {
  if (previewFlagOn(source.preview)) return true;
  if (!source.search) return false;
  const query = source.search.includes("?")
    ? source.search.slice(source.search.indexOf("?") + 1)
    : source.search;
  const params = new URLSearchParams((query.split("#")[0] ?? "").replace(/^\?/, ""));
  return previewFlagOn(params.get("preview"));
}

/** On only when an env flag and `?preview=1` are both set. */
export function isPreviewMode(source: PreviewFlagSource): boolean {
  return isPreviewEnvEnabled(source) && isPreviewQueryEnabled(source);
}
