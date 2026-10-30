import { useEffect, useState } from "react";
import { DemoJournalPanel } from "@/components/demo-journal";
import { MoodChart } from "@/components/mood-chart";
import { Button, Panel, fieldClass } from "@/components/shell";
import { DISCLAIMER, MOODS } from "@/lib/life/catalog";
import {
  EMPTY_PREVIEW_STATE,
  addPreviewMedication,
  readPreviewState,
  removePreviewMedication,
  runPreviewBackend,
  savePreviewNote,
  type PreviewLocalState,
} from "@/lib/life/preview-mode";
import { useSampleJournal } from "@/lib/life/use-preview-mode";
import { cn } from "@/lib/utils";

function dayLabel(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function dayNumber(ymd: string): string {
  return String(Number(ymd.slice(8)));
}

export function PreviewToday() {
  const entries = useSampleJournal();
  const [day, setDay] = useState(entries[0]?.loggedOn ?? "2026-01-05");
  const [local, setLocal] = useState<PreviewLocalState>(EMPTY_PREVIEW_STATE);
  const [note, setNote] = useState("");
  const [noteStatus, setNoteStatus] = useState<string | null>(null);
  const [medName, setMedName] = useState("");
  const [medDose, setMedDose] = useState("");
  const [medTaken, setMedTaken] = useState("Morning");
  const [medStatus, setMedStatus] = useState<string | null>(null);
  const [backendNotice, setBackendNotice] = useState<string | null>(null);

  useEffect(() => {
    const stored = readPreviewState(window.sessionStorage);
    setLocal(stored);
    setNote(stored.notes.find((item) => item.loggedOn === day)?.text ?? "");
    setNoteStatus(null);
  }, [day]);

  const selected = entries.find((entry) => entry.loggedOn === day) ?? entries[0];
  const points = entries.map((entry) => ({
    label: dayNumber(entry.loggedOn),
    mood: entry.mood,
    date: entry.loggedOn,
  }));
  const mood = MOODS.find((item) => item.value === selected?.mood);

  function onSaveNote() {
    const result = savePreviewNote(window.sessionStorage, day, note);
    setLocal(readPreviewState(window.sessionStorage));
    setNoteStatus(result.ok ? "Saved on this device only." : result.reason);
  }

  function onAddMedication() {
    const result = addPreviewMedication(window.sessionStorage, {
      name: medName,
      dose: medDose,
      taken: medTaken,
    });
    if (!result.ok) {
      setMedStatus(result.reason);
      return;
    }
    setLocal(readPreviewState(window.sessionStorage));
    setMedName("");
    setMedDose("");
    setMedStatus("Added on this device only.");
  }

  function onRemoveMedication(id: number) {
    removePreviewMedication(window.sessionStorage, id);
    setLocal(readPreviewState(window.sessionStorage));
  }

  function onBackend(action: "message" | "payment") {
    const result = runPreviewBackend(action);
    setBackendNotice(
      result.effect === "disabled"
        ? action === "payment"
          ? "Payments are off in preview."
          : "Messages are off in preview."
        : null,
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted">Sample data · January 5–15, 2026</p>
          <h1 className="font-display text-4xl">Alex&apos;s journal</h1>
          <p className="mt-2 max-w-xl text-muted">
            A fictional week, already in the app as the demo journal. Nothing on this page is loaded
            from an account.
          </p>
        </div>
        <Panel>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl">Nine sample days</h2>
            <p className="text-xs text-muted">Tap a day</p>
          </div>
          {entries.length ? (
            <MoodChart points={points} selected={day} onPick={setDay} />
          ) : (
            <p className="text-sm text-muted">The sample journal did not load.</p>
          )}
          {selected ? (
            <p className="mt-3 text-sm text-muted">
              {dayLabel(selected.loggedOn)}
              {mood ? ` · ${mood.label}` : ""} · {selected.feelings}
            </p>
          ) : null}
        </Panel>
        <Panel className="space-y-3">
          <h2 className="font-display text-xl">A note on this device</h2>
          <p className="text-sm text-muted">
            Optional. Stored in this browser for the sample dates only. It is not written to an
            account and it does not replace Alex&apos;s entries below.
          </p>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            rows={4}
            className={cn(fieldClass, "py-3")}
            placeholder="A sentence for this preview only."
          />
          <div className="flex items-center gap-3">
            <Button type="button" onClick={onSaveNote}>
              Save on this device
            </Button>
            {noteStatus ? <p className="text-sm text-muted">{noteStatus}</p> : null}
          </div>
        </Panel>
        <DemoJournalPanel />
      </div>
      <div className="space-y-4">
        <Panel className="space-y-3">
          <h2 className="font-display text-xl">Medications</h2>
          <p className="text-sm text-muted">
            Kept on this device. Not shared, and not saved to an account.
          </p>
          <ul className="space-y-2">
            {local.medications.length ? (
              local.medications.map((item) => (
                <li key={item.id} className="rounded-2xl border border-line bg-paper px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted">
                        {[item.dose, item.taken].filter(Boolean).join(" · ") || "No dose written"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-clay"
                      onClick={() => onRemoveMedication(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted">None listed in this preview.</li>
            )}
          </ul>
          <div className="grid gap-2">
            <input
              value={medName}
              onChange={(event) => setMedName(event.target.value)}
              maxLength={80}
              placeholder="Name"
              className={fieldClass}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={medDose}
                onChange={(event) => setMedDose(event.target.value)}
                maxLength={40}
                placeholder="Dose"
                className={fieldClass}
              />
              <input
                value={medTaken}
                onChange={(event) => setMedTaken(event.target.value)}
                maxLength={40}
                placeholder="When"
                className={fieldClass}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" onClick={onAddMedication}>
                Add medication
              </Button>
              {medStatus ? <p className="text-sm text-muted">{medStatus}</p> : null}
            </div>
          </div>
        </Panel>
        <Panel className="space-y-3">
          <h2 className="font-display text-xl">Messages and payments</h2>
          <p className="text-sm text-muted">
            Both stay off. Preview does not contact Venmo, Google Pay, or the visit inbox.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => onBackend("message")}>
              Messages are off
            </Button>
            <Button type="button" variant="ghost" onClick={() => onBackend("payment")}>
              Payments are off
            </Button>
          </div>
          {backendNotice ? <p className="text-sm text-muted">{backendNotice}</p> : null}
        </Panel>
        <p className="text-sm text-muted">If you are in crisis, call or text 988. {DISCLAIMER}</p>
      </div>
    </div>
  );
}
