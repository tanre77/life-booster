import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { MeetingPreference } from "@/components/meeting-preference";
import { Panel } from "@/components/shell";
import { getMeetingSettings, saveMeetingProvider } from "@/lib/life/meeting-api";
import { isDemoMode } from "@/lib/life/demo-mode";
import { meetingProviderLabel, type MeetingProviderId } from "@/lib/life/meetings";

export function MeetingPreferenceCard() {
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });
  const demo = isDemoMode(searchStr, import.meta.env.VITE_LIFE_BOOSTER_DEMO);
  const settings = useQuery({
    queryKey: ["meeting-settings", demo],
    queryFn: () => getMeetingSettings({ data: { demo } }),
  });
  const client = useQueryClient();
  const [pending, setPending] = useState<MeetingProviderId | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const provider = pending ?? settings.data?.provider ?? "google_meet";
  const configured = settings.data
    ? provider === "zoom"
      ? settings.data.zoomConfigured
      : settings.data.googleConfigured
    : false;

  async function choose(next: MeetingProviderId) {
    setPending(next);
    setBusy(true);
    setStatus(null);
    try {
      await saveMeetingProvider({ data: { provider: next } });
      setStatus(`Saved. New visit links use ${meetingProviderLabel(next)}.`);
      await client.invalidateQueries({ queryKey: ["meeting-settings"] });
    } catch (error) {
      setPending(null);
      setStatus(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  const detail = settings.data?.demo
    ? "Practice mode is on. New visit links are sample links."
    : configured
      ? `${meetingProviderLabel(provider)} is connected. Life Booster creates the meeting when you ask.`
      : `${meetingProviderLabel(provider)} is not connected yet. On a visit you can paste a link or start an instant meeting.`;

  return (
    <Panel className="space-y-3">
      <h2 className="font-display text-2xl">Video meetings</h2>
      <p className="text-sm text-muted">
        Choose Zoom or Google Meet. Life Booster saves the choice on your account and uses it when
        you create a visit link.
      </p>
      {settings.isLoading ? <p className="text-sm text-muted">Loading your choice…</p> : null}
      <MeetingPreference
        value={provider}
        onChange={(next) => void choose(next)}
        disabled={busy || settings.isLoading}
      />
      <p className="text-sm text-muted">{detail}</p>
      {status ? <p className="text-sm text-muted">{status}</p> : null}
    </Panel>
  );
}
