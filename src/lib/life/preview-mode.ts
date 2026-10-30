import { loadDemoJournal } from "./demo-journal.ts";
import { isPreviewMode, type PreviewFlagSource } from "./preview-flags.ts";

/**
 * Preview mode extends demo mode: the same Alex journal, no second copy,
 * and no path that reads or writes a real account.
 */

export const PREVIEW_USER_ID = "preview-alex";
export const PREVIEW_EXIT_HREF = "/";
export const PREVIEW_STATE_KEY = "lb-preview-state";

export type PreviewVisitor = "preview" | "pending" | "member" | "signed-out";

export function previewVisitor(input: {
  preview: boolean;
  isPending: boolean;
  hasUser: boolean;
}): PreviewVisitor {
  if (input.preview) return "preview";
  if (input.isPending) return "pending";
  if (input.hasUser) return "member";
  return "signed-out";
}

export function showsSignIn(kind: PreviewVisitor): boolean {
  return kind === "signed-out";
}

/** Home shows the sample journal. Every other route stays unmounted. */
export function previewRoutePolicy(pathname: string): "sample" | "blocked" {
  const path = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  return path === "/" ? "sample" : "blocked";
}

export function hrefWithPreview(path: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set("preview", "1");
  const search = url.searchParams.toString();
  return `${url.pathname}${search ? `?${search}` : ""}`;
}

export function hrefWithoutPreview(href: string): string {
  const url = new URL(href, "http://localhost");
  url.searchParams.delete("preview");
  const search = url.searchParams.toString();
  return `${url.pathname}${search ? `?${search}` : ""}${url.hash}`;
}

const SAMPLE_DATES = new Set(
  loadDemoJournal({ LIFE_BOOSTER_DEMO: "1" }).map((entry) => entry.loggedOn),
);

export function isSampleJournalDate(loggedOn: string): boolean {
  return SAMPLE_DATES.has(loggedOn);
}

/** Same array demo mode returns. Empty unless preview is fully on. */
export function loadPreviewJournal(source: PreviewFlagSource) {
  if (!isPreviewMode(source)) return [];
  return loadDemoJournal({ LIFE_BOOSTER_DEMO: "1" });
}

export type PreviewStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export type PreviewNote = { loggedOn: string; text: string };

export type PreviewMedication = {
  id: number;
  name: string;
  dose: string;
  taken: string;
  shareWithCounselors: false;
};

export type PreviewLocalState = {
  notes: PreviewNote[];
  medications: PreviewMedication[];
};

export const EMPTY_PREVIEW_STATE: PreviewLocalState = { notes: [], medications: [] };

export type PreviewWriteResult =
  | { ok: true; network: false; transport: "session" }
  | { ok: false; network: false; transport: "session" | "disabled"; reason: string };

function isNote(value: unknown): value is PreviewNote {
  if (!value || typeof value !== "object") return false;
  const note = value as { loggedOn?: unknown; text?: unknown };
  return (
    typeof note.loggedOn === "string" &&
    isSampleJournalDate(note.loggedOn) &&
    typeof note.text === "string"
  );
}

function isMedication(
  value: unknown,
): value is { id: number; name: string; dose: string; taken: string } {
  if (!value || typeof value !== "object") return false;
  const item = value as { id?: unknown; name?: unknown; dose?: unknown; taken?: unknown };
  return (
    typeof item.id === "number" &&
    typeof item.name === "string" &&
    typeof item.dose === "string" &&
    typeof item.taken === "string"
  );
}

export function parsePreviewState(raw: string | null): PreviewLocalState {
  if (!raw) return EMPTY_PREVIEW_STATE;
  try {
    const parsed = JSON.parse(raw) as { notes?: unknown; medications?: unknown };
    const notes = Array.isArray(parsed.notes) ? parsed.notes.filter(isNote).slice(0, 9) : [];
    const medications = Array.isArray(parsed.medications)
      ? parsed.medications
          .filter(isMedication)
          .slice(0, 40)
          .map((item) => ({
            id: item.id,
            name: item.name.slice(0, 80),
            dose: item.dose.slice(0, 40),
            taken: item.taken.slice(0, 40),
            shareWithCounselors: false as const,
          }))
      : [];
    return { notes, medications };
  } catch {
    return EMPTY_PREVIEW_STATE;
  }
}

export function readPreviewState(storage: PreviewStorage): PreviewLocalState {
  return parsePreviewState(storage.getItem(PREVIEW_STATE_KEY));
}

function writePreviewState(storage: PreviewStorage, state: PreviewLocalState): void {
  storage.setItem(PREVIEW_STATE_KEY, JSON.stringify(state));
}

export function savePreviewNote(
  storage: PreviewStorage,
  loggedOn: string,
  text: string,
): PreviewWriteResult {
  if (!isSampleJournalDate(loggedOn)) {
    return {
      ok: false,
      network: false,
      transport: "session",
      reason: "Preview only keeps notes on the sample journal dates.",
    };
  }
  const current = readPreviewState(storage);
  const notes = current.notes.filter((note) => note.loggedOn !== loggedOn);
  const trimmed = text.trim().slice(0, 1000);
  if (trimmed) notes.push({ loggedOn, text: trimmed });
  writePreviewState(storage, { ...current, notes });
  return { ok: true, network: false, transport: "session" };
}

export function addPreviewMedication(
  storage: PreviewStorage,
  input: { name: string; dose: string; taken: string },
): PreviewWriteResult {
  const name = input.name.trim().slice(0, 80);
  if (!name) {
    return {
      ok: false,
      network: false,
      transport: "session",
      reason: "Name the medication first.",
    };
  }
  const current = readPreviewState(storage);
  if (current.medications.length >= 40) {
    return {
      ok: false,
      network: false,
      transport: "session",
      reason: "Preview keeps up to 40 medications on this device.",
    };
  }
  const id = current.medications.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  const medications = [
    ...current.medications,
    {
      id,
      name,
      dose: input.dose.trim().slice(0, 40),
      taken: input.taken.trim().slice(0, 40),
      shareWithCounselors: false as const,
    },
  ];
  writePreviewState(storage, { ...current, medications });
  return { ok: true, network: false, transport: "session" };
}

export function removePreviewMedication(storage: PreviewStorage, id: number): PreviewWriteResult {
  const current = readPreviewState(storage);
  writePreviewState(storage, {
    ...current,
    medications: current.medications.filter((item) => item.id !== id),
  });
  return { ok: true, network: false, transport: "session" };
}

/** Messages and payments never leave the browser. Other preview edits stay in session storage. */
export function runPreviewBackend(action: "message" | "payment" | "write"): {
  network: false;
  effect: "disabled" | "session";
} {
  if (action === "message" || action === "payment") return { network: false, effect: "disabled" };
  return { network: false, effect: "session" };
}

export type PreviewNetworkDecision = "allow" | "block";

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function requestParts(
  input: RequestInfo | URL,
  init?: RequestInit,
): { url: string; method: string; headers: Headers } {
  if (typeof Request !== "undefined" && input instanceof Request) {
    const headers = new Headers(input.headers);
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    return { url: input.url, method: (init?.method ?? input.method).toUpperCase(), headers };
  }
  return {
    url: requestUrl(input),
    method: (init?.method ?? "GET").toUpperCase(),
    headers: new Headers(init?.headers),
  };
}

function isPaymentUrl(url: string): boolean {
  try {
    const host = new URL(url, "http://localhost").hostname.toLowerCase();
    return (
      host === "venmo.com" ||
      host.endsWith(".venmo.com") ||
      host === "paypal.com" ||
      host.endsWith(".paypal.com") ||
      host === "stripe.com" ||
      host.endsWith(".stripe.com") ||
      host === "pay.google.com"
    );
  } catch {
    return false;
  }
}

function isSessionProbe(url: string, method: string): boolean {
  if (method !== "GET" && method !== "HEAD") return false;
  try {
    return new URL(url, "http://localhost").pathname === "/api/auth/get-session";
  } catch {
    return false;
  }
}

function isAssetGet(url: string, method: string): boolean {
  if (method !== "GET" && method !== "HEAD") return false;
  let parsed: URL;
  try {
    parsed = new URL(url, "http://localhost");
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return host === "fonts.googleapis.com" || host === "fonts.gstatic.com";
  }
  const path = parsed.pathname;
  if (path.startsWith("/api/")) return false;
  if (
    path.startsWith("/@") ||
    path.startsWith("/src/") ||
    path.startsWith("/node_modules/") ||
    path.startsWith("/__grok/") ||
    path.startsWith("/assets/")
  ) {
    return true;
  }
  return /\.(?:js|mjs|css|map|svg|png|jpe?g|webp|gif|woff2?|ttf|ico|webmanifest)$/i.test(path);
}

/**
 * Preview never performs a real write, and it never issues a server read that
 * could return journal text. Static assets and the auth session probe stay open
 * so the page can render. The probe result is ignored while preview is on.
 */
export function classifyPreviewRequest(input: {
  method?: string;
  url: string;
  headers?: HeadersInit;
}): PreviewNetworkDecision {
  const method = (input.method ?? "GET").toUpperCase();
  const headers = new Headers(input.headers ?? undefined);
  if (isPaymentUrl(input.url)) return "block";
  if (headers.get("x-tsr-serverFn") === "true") return "block";
  if (method !== "GET" && method !== "HEAD") return "block";
  if (isSessionProbe(input.url, method)) return "allow";
  if (isAssetGet(input.url, method)) return "allow";
  return "block";
}

const PREVIEW_BLOCKED = JSON.stringify({ preview: true, blocked: true });

export function createPreviewFetch(base: typeof fetch): typeof fetch {
  const guarded: typeof fetch = (input, init) => {
    const parts = requestParts(input, init);
    if (classifyPreviewRequest(parts) === "block") {
      return Promise.resolve(
        new Response(PREVIEW_BLOCKED, {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
      );
    }
    return base(input, init);
  };
  return guarded;
}

const GUARD_FLAG = Symbol.for("life-booster-preview-fetch");

export function installPreviewNetworkGuard(): () => void {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return () => {};
  const current = window.fetch;
  if ((current as typeof fetch & { [GUARD_FLAG]?: boolean })[GUARD_FLAG]) return () => {};
  const guarded = createPreviewFetch(current.bind(window));
  (guarded as typeof fetch & { [GUARD_FLAG]?: boolean })[GUARD_FLAG] = true;
  window.fetch = guarded;
  return () => {
    if (window.fetch === guarded) window.fetch = current;
  };
}
