import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEMO_PERSONA_NOTE, loadDemoJournal, moodForFeelings } from "./demo-journal.ts";

const DATES = [
  "2026-01-05",
  "2026-01-06",
  "2026-01-07",
  "2026-01-08",
  "2026-01-09",
  "2026-01-12",
  "2026-01-13",
  "2026-01-14",
  "2026-01-15",
];

describe("loadDemoJournal", () => {
  it("loads the 9 demo entries from January 5 through January 15, 2026", () => {
    const entries = loadDemoJournal({ LIFE_BOOSTER_DEMO: "1" });
    assert.equal(entries.length, 9);
    assert.equal(entries[0]?.loggedOn, "2026-01-05");
    assert.equal(entries.at(-1)?.loggedOn, "2026-01-15");
    assert.deepEqual(
      entries.map((entry) => entry.loggedOn),
      DATES,
    );
    assert.equal(entries[0]?.feelings, "anxious, scared, nervous, depressed, lonely, disappointed");
    assert.equal(entries.at(-1)?.feelings, "resilient, hopeful, anxious, loved");
    assert.match(
      entries[0]?.body ?? "",
      /^I'm feeling a lot of this because I'm coming out of a manic episode/,
    );
    assert.match(entries.at(-1)?.body ?? "", /I have to show them I'm putting in the work\.$/);
    for (const entry of entries) {
      assert.equal(entry.mood, moodForFeelings(entry.feelings));
      assert.ok(entry.mood >= 1 && entry.mood <= 5);
      assert.ok(entry.body.length > 0);
    }
    assert.match(DEMO_PERSONA_NOTE, /Fictional persona: Alex/);
  });

  it("stays empty when demo mode is off", () => {
    assert.deepEqual(loadDemoJournal({}), []);
    assert.deepEqual(
      loadDemoJournal({ LIFE_BOOSTER_DEMO: "0", VITE_LIFE_BOOSTER_DEMO: "", search: "" }),
      [],
    );
    assert.equal(loadDemoJournal({ search: "?demo=1" }).length, 9);
    assert.equal(loadDemoJournal({ VITE_LIFE_BOOSTER_DEMO: "true" })[0]?.loggedOn, "2026-01-05");
  });
});
