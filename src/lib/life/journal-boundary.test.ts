import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { DEMO_JOURNAL } from "./demo-journal.ts";

const root = fileURLToPath(new URL("../../..", import.meta.url));

const meetingFiles = [
  "src/lib/life/meetings.ts",
  "src/lib/life/meeting-api.ts",
  "src/lib/life/demo-mode.ts",
  "src/components/meeting-preference.tsx",
  "src/components/meeting-preference-card.tsx",
  "src/components/visit-meeting.tsx",
  "src/components/visit-meeting-card.tsx",
  "src/components/meeting-harness.tsx",
  "migrations/0007_meeting_provider.sql",
];

function filesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry === ".output") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) filesUnder(full, out);
    else if (/\.(ts|tsx|sql|md|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("Alex demo journal boundary", () => {
  it("is the fictional anonymized Alex journal", () => {
    assert.equal(DEMO_JOURNAL.subject, "Alex");
    assert.equal(DEMO_JOURNAL.anonymized, true);
    assert.equal(DEMO_JOURNAL.fictional, true);
    assert.equal(DEMO_JOURNAL.entries.length, 1);
    assert.match(DEMO_JOURNAL.entries[0].body, /^Alex /);
  });

  it("keeps that journal text out of meeting code and the rest of the repo", () => {
    const body = DEMO_JOURNAL.entries[0].body;
    const hits: string[] = [];
    for (const file of filesUnder(root)) {
      if (file.endsWith(`${join("src", "lib", "life", "demo-journal.ts")}`)) continue;
      const text = readFileSync(file, "utf8");
      if (text.includes(body)) hits.push(file);
    }
    assert.deepEqual(hits, []);
  });

  it("does not let meeting code select mood notes", () => {
    for (const relative of meetingFiles) {
      const text = readFileSync(join(root, relative), "utf8");
      assert.equal(text.includes("mood_entries"), false, relative);
      assert.equal(text.includes("demo-journal"), false, relative);
      assert.equal(text.includes("DEMO_JOURNAL"), false, relative);
    }
  });
});
