import { Button, fieldClass } from "@/components/shell";
import {
  meetingProviderLabel,
  meetingSourceLabel,
  type MeetingProviderId,
  type MeetingRecord,
} from "@/lib/life/meetings";

export type MeetingPanelMode = "demo" | "api" | "fallback";

export function VisitMeetingPanel({
  provider,
  meeting,
  mode,
  pastedUrl,
  onPastedUrl,
  busy,
  error,
  onCreate,
}: {
  provider: MeetingProviderId;
  meeting: MeetingRecord | null;
  mode: MeetingPanelMode;
  pastedUrl: string;
  onPastedUrl: (value: string) => void;
  busy: boolean;
  error: string | null;
  onCreate: (kind: "auto" | "pasted" | "instant") => void;
}) {
  const label = meetingProviderLabel(provider);
  return (
    <section aria-label="Counselor video meeting" className="space-y-3">
      <h3 className="font-display text-xl">Counselor video</h3>
      {meeting ? (
        <div className="space-y-2">
          <p className="text-sm text-muted">
            {meetingProviderLabel(meeting.provider)} · {meetingSourceLabel(meeting.source)}
          </p>
          <a
            href={meeting.joinUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center rounded-full bg-spruce-deep px-4 text-sm font-medium text-surface"
          >
            Open {meetingProviderLabel(meeting.provider)}
          </a>
          <p className="text-xs break-all text-muted">{meeting.joinUrl}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted">Your saved choice is {label}.</p>
          {mode === "demo" ? (
            <>
              <p className="text-sm text-muted">Practice mode creates a sample link.</p>
              <Button type="button" disabled={busy} onClick={() => onCreate("auto")}>
                {busy ? "Creating…" : "Create practice link"}
              </Button>
            </>
          ) : null}
          {mode === "api" ? (
            <>
              <p className="text-sm text-muted">
                Life Booster will create the {label} meeting for this visit.
              </p>
              <Button type="button" disabled={busy} onClick={() => onCreate("auto")}>
                {busy ? "Creating…" : "Create meeting"}
              </Button>
            </>
          ) : null}
          {mode === "fallback" ? (
            <>
              <p className="text-sm text-muted">
                Paste a {label} link, or start an instant meeting. The link is saved on this visit.
              </p>
              <form
                className="space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  onCreate("pasted");
                }}
              >
                <label className="block text-sm">
                  <span className="text-muted">{label} link</span>
                  <input
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    value={pastedUrl}
                    onChange={(event) => onPastedUrl(event.target.value)}
                    placeholder={
                      provider === "zoom" ? "https://zoom.us/j/…" : "https://meet.google.com/…"
                    }
                    className={fieldClass}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={busy || pastedUrl.trim() === ""}>
                    {busy ? "Saving…" : "Use pasted link"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => onCreate("instant")}
                  >
                    Instant meeting
                  </Button>
                </div>
              </form>
            </>
          ) : null}
        </div>
      )}
      {error ? <p className="text-sm text-clay">{error}</p> : null}
    </section>
  );
}
