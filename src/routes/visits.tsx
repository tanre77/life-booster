import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { VisitMeetingCard } from "@/components/visit-meeting-card";
import { Stars } from "@/components/stars";
import { Button, Panel, Shell, fieldClass } from "@/components/shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listVisits, submitReview } from "@/lib/life/api";
import { filterProfanity } from "@/lib/life/profanity";
import { formatMoney } from "@/lib/life/money";
import type { Visit } from "@/lib/life/types";

export const Route = createFileRoute("/visits")({ component: VisitsPage });

function VisitsPage() {
  const { user, isPending } = useCurrentUserState();
  const visits = useQuery({
    queryKey: ["visits"],
    queryFn: () => listVisits(),
    enabled: Boolean(user),
  });
  if (isPending) {
    return (
      <Shell>
        <p className="text-muted">Opening your visits…</p>
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return (
    <Shell>
      <div className="space-y-4">
        <h1 className="font-display text-4xl">Visits</h1>
        {visits.isLoading ? <p className="text-muted">Loading…</p> : null}
        {visits.data?.length === 0 ? (
          <Panel>
            <p>No visits yet.</p>
            <Link to="/counselors" className="mt-2 inline-flex text-sm text-spruce-deep">
              Browse counselors
            </Link>
          </Panel>
        ) : null}
        <div className="grid gap-3">
          {visits.data?.map((visit) => (
            <VisitCard key={`${visit.role}-${visit.id}`} visit={visit} />
          ))}
        </div>
      </div>
    </Shell>
  );
}

function VisitCard({ visit }: { visit: Visit }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [softened, setSoftened] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const when = new Date(visit.startsAt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const pay =
    visit.payMethod === "venmo" ? "Venmo" : visit.payMethod === "google_pay" ? "Google Pay" : visit.payMethod;

  async function onReview() {
    if (!stars) {
      setError("Choose 1 to 5 stars.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitReview({ data: { appointmentId: visit.id, stars, comment } });
      setOpen(false);
      await client.invalidateQueries({ queryKey: ["visits"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-wide text-muted uppercase">{visit.role === "counselor" ? "You are hosting" : "You booked"}</p>
          <h2 className="font-display text-2xl">{visit.otherName}</h2>
          <p className="text-sm text-muted">
            {when} · {visit.durationMin} min · {visit.status}
          </p>
        </div>
        <p className="text-sm font-medium">
          {formatMoney(visit.amountCents)}
          <span className="block font-normal text-muted">
            {formatMoney(visit.hourlyRateCents)}/hr · {pay}
            {visit.payStatus === "demo_authorized" ? " · preview hold" : ""}
            {visit.adsDiscount ? " · sponsor rate" : ""}
          </span>
        </p>
      </div>
      {visit.status !== "cancelled" ? (
        <>
          <Link
            to="/session/$appointmentId"
            params={{ appointmentId: String(visit.id) }}
            className="inline-flex min-h-11 items-center rounded-full bg-spruce-deep px-4 text-sm text-surface"
          >
            {visit.role === "counselor" ? "Join video" : "Open video"}
          </Link>
          <VisitMeetingCard appointmentId={visit.id} meeting={visit.meeting} />
        </>
      ) : (
        <p className="text-sm text-muted">Cancelled. Life Booster may dismiss a counselor without notice, which cancels future visits.</p>
      )}
      {visit.role === "member" && visit.status !== "cancelled" && !visit.hasReview ? (
        <div>
          <Button type="button" variant="ghost" onClick={() => setOpen((value) => !value)}>
            {open ? "Close review" : "Rate this visit"}
          </Button>
          {open ? (
            <div className="mt-3 space-y-2">
              <Stars value={stars} onChange={setStars} label="Your rating" />
              <textarea
                value={comment}
                rows={3}
                maxLength={600}
                placeholder="What was the visit like?"
                className={`${fieldClass} py-3`}
                onChange={(event) => {
                  const next = filterProfanity(event.target.value, false);
                  setComment(next.text);
                  setSoftened(next.changed);
                }}
                onBlur={() => {
                  const next = filterProfanity(comment, true);
                  setComment(next.text);
                  setSoftened(next.changed || softened);
                }}
              />
              {softened ? <p className="text-xs text-muted">Some words were filtered out of the review.</p> : null}
              {error ? <p className="text-sm text-clay">{error}</p> : null}
              <Button type="button" disabled={busy} onClick={() => void onReview()}>
                {busy ? "Saving…" : "Publish review"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      {visit.hasReview ? <p className="text-sm text-muted">You reviewed this visit.</p> : null}
    </Panel>
  );
}
