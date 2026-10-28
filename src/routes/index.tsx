import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MoodChart } from "@/components/mood-chart";
import { Button, Panel, Shell, fieldClass } from "@/components/shell";
import { DISCLAIMER, MOODS } from "@/lib/life/catalog";
import { getDashboard, listCounselors, saveMood } from "@/lib/life/api";
import { formatMoney } from "@/lib/life/money";
import { labelDate, localYMD } from "@/lib/life/time";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Stars } from "@/components/stars";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useCurrentUserState();
  return (
    <Shell>
      {isPending ? <p className="text-muted">Opening your week…</p> : user ? <Today name={user.displayName ?? ""} /> : <Landing />}
    </Shell>
  );
}

const LANDING_WEEK = [
  { label: "Mon", mood: 2 },
  { label: "Tue", mood: 2 },
  { label: "Wed", mood: 3 },
  { label: "Thu", mood: 4 },
  { label: "Fri", mood: 4 },
  { label: "Sat", mood: 5 },
  { label: "Sun", mood: 3 },
];

function Landing() {
  const counselors = useQuery({ queryKey: ["counselors"], queryFn: () => listCounselors() });
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <p className="text-xs font-medium tracking-[0.18em] text-spruce uppercase">Weekly mood, real conversations</p>
        <h1 className="max-w-xl font-display text-4xl text-ink sm:text-5xl">A week of how you feel, and someone to talk with.</h1>
        <p className="max-w-lg text-lg text-muted">
          Log a mood, keep a private note, and book 30 minutes up to 2 hours. Share those notes with a counselor only if you say so.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/login" className="inline-flex min-h-11 items-center rounded-full bg-spruce-deep px-5 text-sm font-medium text-surface">
            Start your week
          </Link>
          <Link to="/counselors" className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 text-sm font-medium">
            Browse counselors
          </Link>
        </div>
        <Panel>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-display text-xl">A sample week</h2>
            <p className="text-xs text-muted">Heavy to lifted</p>
          </div>
          <MoodChart points={LANDING_WEEK} />
        </Panel>
        <p className="text-sm text-muted">{DISCLAIMER}</p>
      </div>
      <div className="space-y-3">
        <h2 className="font-display text-2xl">Counselors, priced by the hour</h2>
        {counselors.isLoading ? <p className="text-sm text-muted">Loading people…</p> : null}
        {counselors.data?.slice(0, 4).map((person) => (
          <Link
            key={person.id}
            to="/counselors/$counselorId"
            params={{ counselorId: person.id }}
            className="lift block rounded-card border border-line bg-surface p-4 hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{person.displayName}</p>
                <p className="text-sm text-muted">{person.headline}</p>
              </div>
              <p className="shrink-0 text-sm font-medium text-spruce-deep">{formatMoney(person.hourlyRateCents)}/hr</p>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted">
              <Stars value={person.rating} />
              <span>{person.reviewCount} notes</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Today({ name }: { name: string }) {
  const today = useMemo(() => localYMD(), []);
  const client = useQueryClient();
  const dashboard = useQuery({
    queryKey: ["dashboard", today],
    queryFn: () => getDashboard({ data: { today, suggestedName: name } }),
  });
  const saved = dashboard.data?.moods.find((entry) => entry.loggedOn === today);
  const [mood, setMood] = useState<number>(saved?.mood ?? 3);
  const [note, setNote] = useState(saved?.note ?? "");
  const [share, setShare] = useState(saved?.shareWithCounselors ?? false);
  const [synced, setSynced] = useState(saved?.loggedOn ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (saved && synced !== saved.loggedOn) {
    setMood(saved.mood);
    setNote(saved.note);
    setShare(saved.shareWithCounselors);
    setSynced(saved.loggedOn);
  }

  const points = useMemo(() => {
    const map = new Map((dashboard.data?.moods ?? []).map((entry) => [entry.loggedOn, entry.mood]));
    return Array.from({ length: 7 }, (_, index) => {
      const date = shiftLocal(today, index - 6);
      const label = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" });
      return { label, mood: map.get(date) ?? null };
    });
  }, [dashboard.data?.moods, today]);

  const weekNotes = useMemo(() => {
    const map = new Map((dashboard.data?.moods ?? []).map((entry) => [entry.loggedOn, entry]));
    return Array.from({ length: 7 }, (_, index) => {
      const date = shiftLocal(today, index - 6);
      const entry = map.get(date);
      const label = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      let state = "Not logged";
      if (entry && entry.note.trim()) state = entry.shareWithCounselors ? "Shareable" : "Private";
      else if (entry) state = "Mood only";
      return {
        date,
        label,
        mood: entry ? (MOODS.find((item) => item.value === entry.mood)?.label ?? "") : "",
        note: entry?.note.trim() ?? "",
        state,
      };
    });
  }, [dashboard.data?.moods, today]);

  async function onSave() {
    setSaving(true);
    setStatus(null);
    try {
      await saveMood({ data: { loggedOn: today, today, mood, note, share } });
      await client.invalidateQueries({ queryKey: ["dashboard", today] });
      setStatus("Saved for today.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const upcoming = dashboard.data?.upcoming;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted">{labelDate(today)}</p>
          <h1 className="font-display text-4xl">How is the week landing?</h1>
        </div>
        <Panel>
          <h2 className="mb-2 font-display text-xl">Seven days</h2>
          {dashboard.isLoading ? <p className="text-sm text-muted">Gathering your notes…</p> : <MoodChart points={points} />}
        </Panel>
        <Panel className="space-y-4">
          <h2 className="font-display text-xl">Today</h2>
          <div className="grid grid-cols-5 gap-2">
            {MOODS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setMood(item.value)}
                aria-pressed={mood === item.value}
                className={cn(
                  "min-h-16 rounded-2xl border px-1 text-center transition-[background-color,border-color] duration-150",
                  mood === item.value ? "border-spruce bg-spruce-deep text-surface" : "border-line bg-paper text-ink",
                )}
              >
                <span className="block text-sm font-medium">{item.label}</span>
                <span className={cn("block text-xs", mood === item.value ? "text-surface/80" : "text-muted")}>{item.hint}</span>
              </button>
            ))}
          </div>
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Note</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={1000}
              rows={4}
              className={cn(fieldClass, "py-3")}
              placeholder="A sentence is enough."
            />
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={share}
              onChange={(event) => setShare(event.target.checked)}
              className="mt-1 h-5 w-5 accent-spruce"
            />
            <span>
              Allow a counselor to see this note if I book a visit and turn sharing on for that visit.
              <span className="mt-1 block text-muted">Off by default. Notes stay yours until both switches are on.</span>
            </span>
          </label>
          <div className="flex items-center gap-3">
            <Button type="button" onClick={() => void onSave()} disabled={saving}>
              {saving ? "Saving…" : "Save today"}
            </Button>
            {status ? <p className="text-sm text-muted">{status}</p> : null}
          </div>
          <div className="space-y-2 border-t border-line pt-4">
            <h3 className="text-sm text-muted">This week</h3>
            <ul className="space-y-2">
              {weekNotes.map((day) => (
                <li key={day.date} className="rounded-2xl border border-line bg-paper px-3 py-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium">
                      {day.label}
                      {day.date === today ? " · today" : ""}
                    </p>
                    <p className="text-xs text-muted">
                      {day.mood ? `${day.mood} · ` : ""}
                      {day.state}
                    </p>
                  </div>
                  {day.note ? <p className="mt-1 text-sm">{day.note}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>
      <div className="space-y-4">
        <Panel>
          <h2 className="font-display text-xl">Next visit</h2>
          {upcoming ? (
            <div className="mt-3 space-y-2">
              <p className="font-medium">{upcoming.otherName}</p>
              <p className="text-sm text-muted">
                {new Date(upcoming.startsAt).toLocaleString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {" · "}
                {upcoming.durationMin} min
              </p>
              <Link
                to="/session/$appointmentId"
                params={{ appointmentId: String(upcoming.id) }}
                className="inline-flex min-h-11 items-center rounded-full bg-spruce-deep px-4 text-sm font-medium text-surface"
              >
                Open video room
              </Link>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">Nothing booked. The people directory shows hourly rates and open times.</p>
          )}
          <Link to="/counselors" className="mt-4 inline-flex text-sm font-medium text-spruce-deep">
            Find a counselor
          </Link>
        </Panel>
        <p className="text-sm text-muted">
          If you are in crisis, call or text 988. {DISCLAIMER}
        </p>
      </div>
    </div>
  );
}

function shiftLocal(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return localYMD(date);
}
