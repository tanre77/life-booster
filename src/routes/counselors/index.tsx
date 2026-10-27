import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Stars } from "@/components/stars";
import { Panel, Shell } from "@/components/shell";
import { listCounselors } from "@/lib/life/api";
import { PHILOSOPHIES, RELIGIONS, SPECIALTIES } from "@/lib/life/catalog";
import { formatMoney } from "@/lib/life/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/counselors/")({ component: Directory });

function Directory() {
  const query = useQuery({ queryKey: ["counselors"], queryFn: () => listCounselors() });
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [religion, setReligion] = useState("");
  const [philosophy, setPhilosophy] = useState("");
  const [maxRate, setMaxRate] = useState(0);
  const people = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (query.data ?? []).filter((person) => {
      if (needle && !`${person.displayName} ${person.headline} ${person.bio}`.toLowerCase().includes(needle)) return false;
      if (specialty && !person.specialties.includes(specialty)) return false;
      if (religion && !person.religions.includes(religion)) return false;
      if (philosophy && !person.philosophies.includes(philosophy)) return false;
      if (maxRate && person.hourlyRateCents > maxRate) return false;
      return true;
    });
  }, [query.data, q, specialty, religion, philosophy, maxRate]);

  return (
    <Shell>
      <div className="space-y-5">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl">Counselors</h1>
          <p className="mt-2 text-muted">
            Rates are for one hour. A visit can be 30, 60, 90, or 120 minutes, priced from that hour rate. Sample profiles let you practice the flow. They are not live people.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search"
            aria-label="Search counselors"
            className="min-h-11 rounded-2xl border border-line bg-surface px-3"
          />
          <div className="flex flex-wrap gap-2">
            {[0, 7000, 9000, 12000].map((cents) => (
              <button
                key={cents}
                type="button"
                onClick={() => setMaxRate(cents)}
                className={cn(
                  "min-h-11 rounded-full border px-3 text-sm transition-[background-color,border-color] duration-150",
                  maxRate === cents ? "border-spruce-deep bg-spruce-deep text-surface" : "border-line bg-surface",
                )}
              >
                {cents === 0 ? "Any rate" : `Up to ${formatMoney(cents)}/hr`}
              </button>
            ))}
          </div>
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
            <Link
              key={person.id}
              to="/counselors/$counselorId"
              params={{ counselorId: person.id }}
              className="lift rounded-card border border-line bg-surface p-4 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-medium">{person.displayName}</p>
                  <p className="text-sm text-muted">{person.headline}</p>
                </div>
                <p className="text-right text-sm font-medium text-spruce-deep">
                  {formatMoney(person.hourlyRateCents)}
                  <span className="block font-normal text-muted">per hour</span>
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {person.specialties.slice(0, 3).map((item) => (
                  <span key={item} className="rounded-full bg-paper px-2 py-1 text-xs text-muted">
                    {item}
                  </span>
                ))}
                {person.sample ? <span className="rounded-full bg-paper px-2 py-1 text-xs text-clay">Sample</span> : null}
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-muted">
                <Stars value={person.rating} />
                <span>
                  {person.rating ? person.rating.toFixed(1) : "New"} · {person.reviewCount}
                </span>
              </div>
            </Link>
          ))}
        </div>
        {!query.isLoading && people.length === 0 ? (
          <Panel>
            <p>No one matches those filters.</p>
          </Panel>
        ) : null}
      </div>
    </Shell>
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
