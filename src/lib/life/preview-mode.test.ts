import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { DEMO_JOURNAL_ENTRIES, loadDemoJournal } from "./demo-journal.ts";
import {
  EMPTY_PREVIEW_STATE,
  PREVIEW_EXIT_HREF,
  PREVIEW_STATE_KEY,
  PREVIEW_USER_ID,
  addPreviewMedication,
  classifyPreviewRequest,
  createPreviewFetch,
  hrefWithPreview,
  hrefWithoutPreview,
  loadPreviewJournal,
  parsePreviewState,
  previewRoutePolicy,
  previewVisitor,
  readPreviewState,
  removePreviewMedication,
  runPreviewBackend,
  savePreviewNote,
  showsSignIn,
  type PreviewStorage,
} from "./preview-mode.ts";
import { isPreviewMode } from "./preview-flags.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const ON = { VITE_LIFE_BOOSTER_PREVIEW: "1", search: "?preview=1" };

function memoryStorage(): PreviewStorage & { dump: () => string | null } {
  const mem = new Map<string, string>();
  return {
    getItem: (key) => mem.get(key) ?? null,
    setItem: (key, value) => {
      mem.set(key, value);
    },
    removeItem: (key) => {
      mem.delete(key);
    },
    dump: () => mem.get(PREVIEW_STATE_KEY) ?? null,
  };
}

describe("preview mode switches", () => {
  it("stays off unless the env flag and ?preview=1 are both set", () => {
    assert.equal(isPreviewMode({}), false);
    assert.equal(isPreviewMode({ VITE_LIFE_BOOSTER_PREVIEW: "1" }), false);
    assert.equal(isPreviewMode({ LIFE_BOOSTER_PREVIEW: "1" }), false);
    assert.equal(isPreviewMode({ search: "?preview=1" }), false);
    assert.equal(isPreviewMode({ preview: "1" }), false);
    assert.equal(isPreviewMode({ VITE_LIFE_BOOSTER_PREVIEW: "0", search: "?preview=1" }), false);
    assert.equal(isPreviewMode(ON), true);
    assert.equal(isPreviewMode({ LIFE_BOOSTER_PREVIEW: "yes", preview: "on" }), true);
    assert.equal(
      isPreviewMode({
        VITE_LIFE_BOOSTER_PREVIEW: "true",
        search: "https://life-booster.test/visits?preview=1",
      }),
      true,
    );
  });

  it("extends demo mode with the same Alex journal, not a second copy", () => {
    const preview = loadPreviewJournal(ON);
    const demo = loadDemoJournal({ LIFE_BOOSTER_DEMO: "1" });
    assert.equal(preview, demo);
    assert.equal(preview, DEMO_JOURNAL_ENTRIES);
    assert.equal(loadDemoJournal(ON), DEMO_JOURNAL_ENTRIES);
    assert.equal(preview.length, 9);
    assert.equal(preview[0]?.loggedOn, "2026-01-05");
    assert.equal(preview.at(-1)?.loggedOn, "2026-01-15");
    assert.equal(loadPreviewJournal({ search: "?preview=1" }).length, 0);
    assert.equal(loadPreviewJournal({ VITE_LIFE_BOOSTER_PREVIEW: "1" }).length, 0);
    assert.equal(loadDemoJournal({}).length, 0);
    const dates = new Set(preview.map((entry) => entry.loggedOn));
    assert.equal(dates.has("2026-10-30"), false);
  });
});

describe("preview sign-in", () => {
  it("does not require a session or a sign-in wall", () => {
    const kind = previewVisitor({ preview: true, isPending: true, hasUser: false });
    assert.equal(kind, "preview");
    assert.equal(showsSignIn(kind), false);
    assert.equal(
      showsSignIn(previewVisitor({ preview: true, isPending: false, hasUser: false })),
      false,
    );
    assert.equal(
      previewVisitor({ preview: false, isPending: false, hasUser: false }),
      "signed-out",
    );
    assert.equal(showsSignIn("signed-out"), true);
    assert.equal(PREVIEW_USER_ID, "preview-alex");
    assert.equal(PREVIEW_EXIT_HREF, "/");
    assert.equal(PREVIEW_EXIT_HREF.includes("preview"), false);
  });

  it("keeps every route except home from mounting account pages", () => {
    assert.equal(previewRoutePolicy("/"), "sample");
    assert.equal(previewRoutePolicy("/login"), "blocked");
    assert.equal(previewRoutePolicy("/visits"), "blocked");
    assert.equal(previewRoutePolicy("/session/42"), "blocked");
    assert.equal(previewRoutePolicy("/counselors/"), "blocked");
    assert.equal(hrefWithPreview("/visits"), "/visits?preview=1");
    assert.equal(hrefWithoutPreview("/visits?preview=1&demo=1"), "/visits?demo=1");
  });
});

describe("preview storage and backend", () => {
  it("keeps notes and medications in storage and never shares them", () => {
    const storage = memoryStorage();
    assert.deepEqual(readPreviewState(storage), EMPTY_PREVIEW_STATE);
    const saved = savePreviewNote(storage, "2026-01-05", "  local only  ");
    assert.deepEqual(saved, { ok: true, network: false, transport: "session" });
    assert.equal(readPreviewState(storage).notes[0]?.text, "local only");
    const rejected = savePreviewNote(storage, "2026-10-30", "a real day");
    assert.equal(rejected.ok, false);
    assert.equal(rejected.network, false);
    assert.equal(
      readPreviewState(storage).notes.some((note) => note.loggedOn === "2026-10-30"),
      false,
    );

    const added = addPreviewMedication(storage, { name: "Sample", dose: "1", taken: "Morning" });
    assert.equal(added.network, false);
    assert.equal(added.ok, true);
    assert.equal(readPreviewState(storage).medications[0]?.shareWithCounselors, false);
    removePreviewMedication(storage, 1);
    assert.equal(readPreviewState(storage).medications.length, 0);

    const poisoned = JSON.stringify({
      notes: [{ loggedOn: "2026-10-30", text: "not the sample journal" }],
      medications: [{ id: 3, name: "Local", dose: "", taken: "", shareWithCounselors: true }],
    });
    const parsed = parsePreviewState(poisoned);
    assert.equal(parsed.notes.length, 0);
    assert.equal(parsed.medications[0]?.shareWithCounselors, false);
    assert.equal(JSON.stringify(parsed).includes("not the sample journal"), false);
  });

  it("disables messages and payments", () => {
    assert.deepEqual(runPreviewBackend("message"), { network: false, effect: "disabled" });
    assert.deepEqual(runPreviewBackend("payment"), { network: false, effect: "disabled" });
    assert.deepEqual(runPreviewBackend("write"), { network: false, effect: "session" });
  });
});

describe("preview network", () => {
  it("blocks writes, server reads, and payment hosts", async () => {
    const calls: string[] = [];
    const base: typeof fetch = async (input) => {
      calls.push(String(input));
      return new Response("should-not-send");
    };
    const fetch = createPreviewFetch(base);
    const secret = DEMO_JOURNAL_ENTRIES[0]?.body.slice(0, 48) ?? "";
    assert.ok(secret.length > 0);

    const write = await fetch("https://life-booster.test/save", {
      method: "POST",
      headers: { "x-tsr-serverFn": "true", "content-type": "application/json" },
      body: JSON.stringify({ note: secret }),
    });
    const writeText = await write.text();
    assert.equal(write.status, 403);
    assert.equal(writeText.includes(secret), false);
    assert.equal(calls.length, 0);

    const read = await fetch("/_server?payload=journal", {
      method: "GET",
      headers: { "x-tsr-serverFn": "true" },
    });
    assert.equal(read.status, 403);
    assert.equal(calls.length, 0);

    const pay = await fetch("https://venmo.com/?txn=pay&amount=40", { method: "GET" });
    assert.equal(pay.status, 403);
    const signIn = await fetch("/api/auth/sign-in/email", { method: "POST", body: "{}" });
    assert.equal(signIn.status, 403);
    assert.equal(calls.length, 0);

    assert.equal(classifyPreviewRequest({ method: "POST", url: "/api/messages" }), "block");
    assert.equal(
      classifyPreviewRequest({
        method: "GET",
        url: "/dashboard",
        headers: { "x-tsr-serverFn": "true" },
      }),
      "block",
    );

    const session = await fetch("/api/auth/get-session", { method: "GET" });
    const asset = await fetch("/src/routes/index.tsx", { method: "GET" });
    assert.equal(await session.text(), "should-not-send");
    assert.equal(await asset.text(), "should-not-send");
    assert.deepEqual(calls, ["/api/auth/get-session", "/src/routes/index.tsx"]);
  });
});

describe("preview sources stay off account data", () => {
  it("does not duplicate the journal or call account APIs", () => {
    const files = [
      "src/lib/life/preview-flags.ts",
      "src/lib/life/preview-mode.ts",
      "src/lib/life/use-preview-mode.ts",
      "src/components/preview-today.tsx",
      "src/components/preview-limited.tsx",
      "src/components/preview-mode-banner.tsx",
      "src/components/preview-network-guard.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(join(root, file), "utf8");
      assert.equal(source.includes("console."), false, file);
      assert.equal(source.includes("getDashboard"), false, file);
      assert.equal(source.includes("getSql"), false, file);
      assert.equal(source.includes("mood_entries"), false, file);
      assert.equal(source.includes("@/lib/life/api"), false, file);
      assert.equal(source.includes("Biscuit"), false, file);
    }
    const home = readFileSync(join(root, "src/routes/index.tsx"), "utf8");
    assert.match(home, /preview \? <PreviewToday \/>/);
    const login = readFileSync(join(root, "src/routes/login.tsx"), "utf8");
    assert.match(login, /No sign-in/);
  });
});
