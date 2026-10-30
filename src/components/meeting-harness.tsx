import { useState } from "react";
import { createRoot } from "react-dom/client";
import { MeetingPreference } from "@/components/meeting-preference";
import { VisitMeetingPanel, type MeetingPanelMode } from "@/components/visit-meeting";
import { createMeeting, type MeetingProviderId, type MeetingRecord } from "@/lib/life/meetings";
import "@/styles.css";

const STARTS_AT = "2026-11-02T15:00:00.000Z";

export function Harness() {
  const [provider, setProvider] = useState<MeetingProviderId>("google_meet");
  const [meeting, setMeeting] = useState<MeetingRecord | null>(null);
  const [pastedUrl, setPastedUrl] = useState("");
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mode: MeetingPanelMode = demo ? "demo" : "fallback";

  async function onCreate(kind: "auto" | "pasted" | "instant") {
    setBusy(true);
    setError(null);
    try {
      const created = await createMeeting(
        {
          provider,
          startsAt: STARTS_AT,
          durationMin: 60,
          pastedUrl: kind === "pasted" ? pastedUrl : undefined,
        },
        { demo, credentials: {} },
      );
      setMeeting(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the meeting.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-xl bg-paper p-6 text-ink">
      <h1 className="font-display text-4xl">Video meetings</h1>
      <p className="mt-2 text-sm text-muted">Choose a provider, then create the visit link.</p>
      <div className="mt-4 space-y-4 rounded-card border border-line bg-surface p-4">
        <MeetingPreference
          value={provider}
          onChange={(next) => {
            setProvider(next);
            setMeeting(null);
            setError(null);
          }}
        />
        <button
          type="button"
          className="min-h-11 rounded-full border border-line px-4 text-sm"
          onClick={() => {
            setDemo((value) => !value);
            setMeeting(null);
            setError(null);
          }}
        >
          {demo ? "Practice mode on" : "Practice mode off"}
        </button>
        <VisitMeetingPanel
          provider={provider}
          meeting={meeting}
          mode={mode}
          pastedUrl={pastedUrl}
          onPastedUrl={setPastedUrl}
          busy={busy}
          error={error}
          onCreate={(kind) => void onCreate(kind)}
        />
      </div>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing root");
createRoot(root).render(<Harness />);
