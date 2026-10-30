import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { VisitMeetingPanel, type MeetingPanelMode } from "@/components/visit-meeting";
import { isDemoMode } from "@/lib/life/demo-mode";
import { createVisitMeeting, getMeetingSettings } from "@/lib/life/meeting-api";
import type { MeetingRecord } from "@/lib/life/meetings";

export function VisitMeetingCard({
  appointmentId,
  meeting,
}: {
  appointmentId: number;
  meeting: MeetingRecord | null;
}) {
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });
  const demo = isDemoMode(searchStr, import.meta.env.VITE_LIFE_BOOSTER_DEMO);
  const settings = useQuery({
    queryKey: ["meeting-settings", demo],
    queryFn: () => getMeetingSettings({ data: { demo } }),
  });
  const client = useQueryClient();
  const [pastedUrl, setPastedUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<MeetingRecord | null>(null);
  const current = local ?? meeting;
  const provider = settings.data?.provider ?? "google_meet";
  const configured = settings.data
    ? provider === "zoom"
      ? settings.data.zoomConfigured
      : settings.data.googleConfigured
    : false;
  const mode: MeetingPanelMode = settings.data?.demo ? "demo" : configured ? "api" : "fallback";

  async function onCreate(kind: "auto" | "pasted" | "instant") {
    setBusy(true);
    setError(null);
    try {
      const created = await createVisitMeeting({
        data: {
          appointmentId,
          demo,
          pastedUrl: kind === "pasted" ? pastedUrl : undefined,
        },
      });
      setLocal(created);
      await client.invalidateQueries({ queryKey: ["visits"] });
      await client.invalidateQueries({ queryKey: ["session", appointmentId] });
      await client.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the meeting.");
    } finally {
      setBusy(false);
    }
  }

  if (settings.isLoading) {
    return <p className="text-sm text-muted">Checking video settings…</p>;
  }

  return (
    <VisitMeetingPanel
      provider={provider}
      meeting={current}
      mode={mode}
      pastedUrl={pastedUrl}
      onPastedUrl={setPastedUrl}
      busy={busy}
      error={error}
      onCreate={(kind) => void onCreate(kind)}
    />
  );
}
