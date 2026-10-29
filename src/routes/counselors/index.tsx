import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Stars } from "@/components/stars";
import { Panel, Shell } from "@/components/shell";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { followCounselor, listCounselors, listFollows, listPractices, listVisits } from "@/lib/life/api";
import { PHILOSOPHIES, RELIGIONS, SPECIALTIES } from "@/lib/life/catalog";
import { formatMoney } from "@/lib/life/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/counselors/")({ component: Directory });

const TOPICS = ["Sleep", "Stress", "Anxiety", "Grief", "Low mood", "Relationships", "Faith questions"] as const;

function Directory() {
  const { user } = useCurrentUserState();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["counselors"], queryFn: () => listCounselors() });
  const practices = useQuery({ queryKey: ["practices"], queryFn: () => listPractices() });
  const follows = useQuery({ queryKey: ["follows"], queryFn: () => listFollows(), enabled: Boolean(user) });
  const visits = useQuery({ queryKey: ["visits"], queryFn: () => listVisits(), enabled: Boolean(user) });
  const scheduled = useMemo(() => {
    const map = new Map<string, string>();
    for (const visit of visits.data ?? []) {
      if (visit.role !== "member" || visit.status === "cancelled") continue;
      if (new Date(visit.startsAt).getTime() < Date.now() - 60 * 60 * 1000) continue;
      map.set(
        visit.otherId,
        new Date(visit.startsAt).toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
      );
    }
    return map;
  }, [visits.data]);
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [religion, setReligion] = useState("");
  const [philosophy, setPhilosophy] = useState("");
  const [maxRate, setMaxRate] = useState(0);
  const [followingOnly, setFollowingOnly] = useState(false);
  const followed = useMemo(() => new Set(follows.data ?? []), [follows.data]);

  const people = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filter = topic || specialty;
    return (query.data ?? []).filter((person) => {
      if (followingOnly && !followed.has(person.id)) return false;
      if (needle && !`${person.displayName} ${person.headline} ${person.bio}`.toLowerCase().includes(needle)) return false;
      if (filter && !person.specialties.includes(filter)) return false;
      if (religion && !person.religions.includes(religion)) return false;
      if (philosophy && !person.philosophies.includes(philosophy)) return false;
      if (maxRate && person.hourlyRateCents > maxRate) return false;
      return true;
    });
  }, [query.data, q, topic, specialty, religion, philosophy, maxRate, followingOnly, followed]);

  const tracks = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (practices.data ?? []).filter((item) => {
      if (topic && item.topic !== topic) return false;
      if (followingOnly && !followed.has(item.counselorId)) return false;
      if (needle && !`${item.title} ${item.counselorName} ${item.body}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [practices.data, topic, q, followingOnly, followed]);

  async function toggleFollow(id: string) {
    if (!user) return;
    const next = !followed.has(id);
    await followCounselor({ data: { id, follow: next } });
    await client.invalidateQueries({ queryKey: ["follows"] });
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.16em] text-spruce uppercase">Library</p>
          <h1 className="font-display text-4xl">Practices and counselors</h1>
          <p className="mt-2 text-muted">
            Pick a topic, follow a counselor, or start a short sit. Live visits are still booked from a counselor's page.
          </p>
        </div>
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search practices or counselors"
          aria-label="Search the library"
          className="min-h-11 w-full rounded-2xl border border-line bg-surface px-3"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          <TopicChip label="All" on={topic === ""} onClick={() => setTopic("")} />
          {TOPICS.map((item) => (
            <TopicChip key={item} label={item} on={topic === item} onClick={() => setTopic(item)} />
          ))}
          {user ? <TopicChip label="Following" on={followingOnly} onClick={() => setFollowingOnly((value) => !value)} /> : null}
        </div>
        <section className="space-y-3">
          <h2 className="font-display text-2xl">Practices</h2>
          {practices.isLoading ? <p className="text-sm text-muted">Loading practices…</p> : null}
          {tracks.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {tracks.map((item) => (
                <Link
                  key={item.id}
                  to="/practice/$practiceId"
                  params={{ practiceId: String(item.id) }}
                  className="lift rounded-card border border-line bg-surface p-4 hover:-translate-y-0.5"
                >
                  <p className="text-xs text-spruce">{item.topic}</p>
                  <p className="mt-1 font-medium">{item.title}</p>
                  <p className="text-sm text-muted">
                    {item.minutes} min · {item.counselorName}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <Panel>
              <p className="text-sm text-muted">
                No practices in this topic yet. Counselors publish them from Studio. You can still book a visit below.
              </p>
            </Panel>
          )}
        </section>
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-2xl">Counselors</h2>
            <p className="text-xs text-muted">Open now means their hours cover this minute</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[0, 7000, 9000, 12000].map((cents) => (
              <button
                key={cents}
                type="button"
                onClick={() => setMaxRate(cents)}
                className={cn(
                  "min-h-11 rounded-full border px-3 text-sm",
                  maxRate === cents ? "border-spruce-deep bg-spruce-deep text-surface" : "border-line bg-surface",
                )}
              >
                {cents === 0 ? "Any rate" : `Up to ${formatMoney(cents)}/hr`}
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Filter label="Specialty" value={specialty} options={SPECIALTIES} onChange={setSpecialty} />
            <Filter label="Religion" value={religion} options={RELIGIONS} onChange={setReligion} />
            <Filter label="Philosophy" value={philosophy} options={PHILOSOPHIES} onChange={setPhilosophy} />
          </div>
          {query.isLoading ? <p className="text-muted">Loading counselors…</p> : null}
          {query.isError ? <p className="text-clay">The directory did not load. Try again in a moment.</p> : null}
          <div className="grid gap-3 md:grid-cols-2">
            {people.map((person) => (
              <div key={person.id} className="rounded-card border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link to="/counselors/$counselorId" params={{ counselorId: person.id }} className="min-w-0">
                    <p className="text-lg font-medium">{person.displayName}</p>
                    <p className="text-sm text-muted">{person.headline}</p>
                  </Link>
                  <p className="text-right text-sm font-medium text-spruce-deep">
                    {formatMoney(person.hourlyRateCents)}
                    <span className="block font-normal text-muted">per hour</span>
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {person.openNow ? <span className="rounded-full bg-spruce-deep px-2 py-1 text-xs text-surface">Open now</span> : null}
                  {person.specialties.slice(0, 3).map((item) => (
                    <span key={item} className="rounded-full bg-paper px-2 py-1 text-xs text-muted">
                      {item}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted">
                  <span className="inline-flex items-center gap-2">
                    <Stars value={person.rating} />
                    <span>{person.rating ? person.rating.toFixed(1) : "New"}</span>
                  </span>
                  {user ? (
                    <button type="button" className="font-medium text-spruce-deep" onClick={() => void toggleFollow(person.id)}>
                      {followed.has(person.id) ? "Following" : "Follow"}
                    </button>
                  ) : null}
                </div>
                {scheduled.get(person.id) ? (
                  <p className="mt-2 text-sm font-medium text-spruce-deep">Scheduled · {scheduled.get(person.id)}</p>
                ) : null}
              </div>
            ))}
          </div>
          {!query.isLoading && people.length === 0 ? (
            <Panel>
              <p>No counselors match. A counselor appears after they save hours in Studio.</p>
            </Panel>
          ) : null}
        </section>
      </div>
    </Shell>
  );
}

function TopicChip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 shrink-0 rounded-full border px-4 text-sm",
        on ? "border-spruce-deep bg-spruce-deep text-surface" : "border-line bg-surface",
      )}
    >
      {label}
    </button>
  );
}

function Filter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-2xl border border-line bg-surface px-3"
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
