import { Panel } from "@/components/shell";
import { MOODS } from "@/lib/life/catalog";
import { DEMO_PERSONA_NOTE } from "@/lib/life/demo-journal";
import { useSampleJournal } from "@/lib/life/use-preview-mode";

function journalDate(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DemoJournalPanel() {
  const entries = useSampleJournal();
  if (!entries.length) return null;
  return (
    <Panel className="space-y-4">
      <div>
        <p
          data-testid="sample-journal"
          className="text-xs font-medium tracking-[0.18em] text-spruce uppercase"
        >
          Sample journal
        </p>
        <h2 className="mt-1 font-display text-xl">Alex, January 2026</h2>
        <p className="mt-2 text-sm text-muted">{DEMO_PERSONA_NOTE}</p>
      </div>
      <ol className="space-y-3">
        {entries.map((entry) => {
          const mood = MOODS.find((item) => item.value === entry.mood);
          return (
            <li key={entry.loggedOn} className="rounded-2xl border border-line bg-paper px-3 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{journalDate(entry.loggedOn)}</p>
                <p className="text-xs text-muted">{mood ? `${mood.label} · ${mood.hint}` : ""}</p>
              </div>
              <p className="mt-2 text-sm">
                <span className="text-muted">Feelings: </span>
                {entry.feelings}
              </p>
              <p className="mt-2 text-sm whitespace-pre-wrap">{entry.body}</p>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
