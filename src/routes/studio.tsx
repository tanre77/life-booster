import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Button, Panel, Shell, fieldClass } from "@/components/shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyCounselor, saveAvailability, saveCounselorBio } from "@/lib/life/api";
import { PHILOSOPHIES, RELIGIONS, SPECIALTIES } from "@/lib/life/catalog";
import { formatMoney } from "@/lib/life/money";
import { WEEKDAY_LABELS, minutesToHHMM } from "@/lib/life/time";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio")({ component: StudioPage });

type DraftBlock = { weekday: number; start: string; end: string };

function StudioPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <Shell>
        <p className="text-muted">Opening studio…</p>
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return (
    <Shell>
      <Studio />
    </Shell>
  );
}

function Studio() {
  const query = useQuery({ queryKey: ["my-counselor"], queryFn: () => getMyCounselor() });
  const profile = query.data;
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [religions, setReligions] = useState<string[]>([]);
  const [philosophies, setPhilosophies] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [dollars, setDollars] = useState("80");
  const [timezone, setTimezone] = useState("America/New_York");
  const [blocks, setBlocks] = useState<DraftBlock[]>([]);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();

  useEffect(() => {
    if (query.isLoading || ready) return;
    if (profile) {
      setDisplayName(profile.displayName);
      setHeadline(profile.headline);
      setBio(profile.bio);
      setReligions(profile.religions);
      setPhilosophies(profile.philosophies);
      setSpecialties(profile.specialties);
      setDollars(String(Math.round(profile.hourlyRateCents / 100)));
      setTimezone(profile.timezone);
      setBlocks(
        profile.blocks.map((block) => ({
          weekday: block.weekday,
          start: minutesToHHMM(block.startMin),
          end: minutesToHHMM(block.endMin),
        })),
      );
    } else {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (zone) setTimezone(zone);
    }
    setReady(true);
  }, [query.isLoading, profile, ready]);

  function toggle(list: string[], value: string, set: (next: string[]) => void) {
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value].slice(0, 8));
  }

  async function saveBio(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await saveCounselorBio({
        data: {
          displayName,
          headline,
          bio,
          religions,
          philosophies,
          specialties,
          hourlyDollars: Number(dollars),
          timezone,
        },
      });
      setStatus("Bio saved. Add hours so people can book you.");
      await client.invalidateQueries({ queryKey: ["my-counselor"] });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function saveHours() {
    setBusy(true);
    setStatus(null);
    try {
      await saveAvailability({
        data: {
          blocks: blocks.flatMap((block) => {
            const [sh, sm] = block.start.split(":").map(Number);
            const [eh, em] = block.end.split(":").map(Number);
            return [{ weekday: block.weekday, startMin: sh * 60 + sm, endMin: eh * 60 + em }];
          }),
        },
      });
      setStatus("Hours saved.");
      await client.invalidateQueries({ queryKey: ["my-counselor"] });
      await client.invalidateQueries({ queryKey: ["counselors"] });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save hours.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Studio</h1>
        <p className="mt-2 max-w-xl text-muted">
          Write the bio people see, list religions, philosophies, and treatment specialties, and set the days you take clients. Your price is always shown as a one-hour rate.
        </p>
      </div>
      {profile?.standing === "dismissed" ? (
        <Panel>
          <p>Life Booster dismissed this profile without notice. You can read it, but new bookings are closed until the desk restores you.</p>
        </Panel>
      ) : null}
      <form onSubmit={(event) => void saveBio(event)} className="grid gap-4">
        <Panel className="grid gap-3">
          <h2 className="font-display text-2xl">Bio</h2>
          <label className="text-sm">
            <span className="text-muted">Name</span>
            <input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={fieldClass} />
          </label>
          <label className="text-sm">
            <span className="text-muted">Headline</span>
            <input required value={headline} onChange={(event) => setHeadline(event.target.value)} className={fieldClass} maxLength={120} />
          </label>
          <label className="text-sm">
            <span className="text-muted">About you</span>
            <textarea required value={bio} onChange={(event) => setBio(event.target.value)} rows={5} maxLength={2000} className={`${fieldClass} py-3`} />
          </label>
          <label className="text-sm">
            <span className="text-muted">Hourly rate in dollars</span>
            <input
              required
              type="number"
              min={15}
              max={400}
              value={dollars}
              onChange={(event) => setDollars(event.target.value)}
              className={fieldClass}
            />
            <span className="mt-1 block text-muted">{formatMoney(Math.round(Number(dollars || 0) * 100))} per hour</span>
          </label>
          <label className="text-sm">
            <span className="text-muted">Timezone for your hours</span>
            <input value={timezone} onChange={(event) => setTimezone(event.target.value)} className={fieldClass} />
          </label>
        </Panel>
        <Picker title="Religions" options={RELIGIONS} selected={religions} onToggle={(value) => toggle(religions, value, setReligions)} />
        <Picker title="Philosophies" options={PHILOSOPHIES} selected={philosophies} onToggle={(value) => toggle(philosophies, value, setPhilosophies)} />
        <Picker title="Treatment specialties" options={SPECIALTIES} selected={specialties} onToggle={(value) => toggle(specialties, value, setSpecialties)} />
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : profile ? "Update bio" : "Publish bio"}
        </Button>
      </form>
      <Panel className="space-y-4">
        <h2 className="font-display text-2xl">Hours</h2>
        <p className="text-sm text-muted">30-minute steps. People can book inside these windows for 30, 60, 90, or 120 minutes.</p>
        {WEEKDAY_LABELS.map((label, weekday) => (
          <div key={label} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-medium">{label}</p>
              <button
                type="button"
                className="text-sm text-spruce-deep"
                onClick={() => setBlocks((current) => [...current, { weekday, start: "09:00", end: "12:00" }])}
              >
                Add window
              </button>
            </div>
            {blocks.map((block, index) =>
              block.weekday === weekday ? (
                <div key={`${label}-${index}`} className="flex flex-wrap items-center gap-2">
                  <input
                    type="time"
                    step={1800}
                    value={block.start}
                    onChange={(event) => updateBlock(setBlocks, index, { start: event.target.value })}
                    className="min-h-11 rounded-xl border border-line bg-paper px-2"
                  />
                  <span className="text-muted">to</span>
                  <input
                    type="time"
                    step={1800}
                    value={block.end}
                    onChange={(event) => updateBlock(setBlocks, index, { end: event.target.value })}
                    className="min-h-11 rounded-xl border border-line bg-paper px-2"
                  />
                  <button type="button" className="text-sm text-clay" onClick={() => setBlocks((current) => current.filter((_, i) => i !== index))}>
                    Remove
                  </button>
                </div>
              ) : null,
            )}
          </div>
        ))}
        <Button type="button" disabled={busy || !profile} onClick={() => void saveHours()}>
          Save hours
        </Button>
        {!profile ? <p className="text-sm text-muted">Save a bio before hours.</p> : null}
      </Panel>
      {status ? <p className="text-sm text-muted">{status}</p> : null}
    </div>
  );
}

function updateBlock(setBlocks: Dispatch<SetStateAction<DraftBlock[]>>, index: number, patch: Partial<DraftBlock>) {
  setBlocks((current) => current.map((block, i) => (i === index ? { ...block, ...patch } : block)));
}

function Picker({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <Panel>
      <h2 className="font-display text-xl">{title}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const on = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(option)}
              className={cn(
                "min-h-11 rounded-full border px-3 text-sm transition-[background-color,border-color] duration-150",
                on ? "border-spruce-deep bg-spruce-deep text-surface" : "border-line bg-paper",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
