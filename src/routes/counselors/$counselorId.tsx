import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Stars } from "@/components/stars";
import { Button, Panel, Shell } from "@/components/shell";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { bookAppointment, getCounselor, listSlots } from "@/lib/life/api";
import { DISCLAIMER } from "@/lib/life/catalog";
import { DURATIONS, formatMoney, hoursLabel, sessionPriceCents, type DurationMin } from "@/lib/life/money";
import { labelDate, labelTime } from "@/lib/life/time";
import { requestWallet, type WalletMethod } from "@/lib/life/wallet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/counselors/$counselorId")({ component: CounselorPage });

function CounselorPage() {
  const { counselorId } = Route.useParams();
  const query = useQuery({
    queryKey: ["counselor", counselorId],
    queryFn: () => getCounselor({ data: { id: counselorId } }),
  });
  const person = query.data?.counselor;
  return (
    <Shell>
      {query.isLoading ? <p className="text-muted">Opening profile…</p> : null}
      {query.data === null ? (
        <Panel>
          <p>This counselor is not available. Life Booster can dismiss a profile without notice.</p>
          <Link to="/counselors" className="mt-3 inline-flex text-sm text-spruce-deep">
            Back to people
          </Link>
        </Panel>
      ) : null}
      {person ? (
        <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <article className="min-w-0 space-y-4">
            <div>
              {person.sample ? <p className="text-xs font-medium tracking-wide text-clay uppercase">Sample profile</p> : null}
              <h1 className="font-display text-4xl">{person.displayName}</h1>
              <p className="mt-1 text-lg text-muted">{person.headline}</p>
              <p className="mt-3 font-display text-3xl text-spruce-deep">
                {formatMoney(person.hourlyRateCents)}
                <span className="ml-2 font-sans text-base font-normal text-muted">per hour</span>
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted">
                <Stars value={person.rating} />
                <span>{person.reviewCount} reviews</span>
              </div>
            </div>
            <p className="max-w-xl whitespace-pre-wrap">{person.bio}</p>
            <TagGroup title="Religions" items={person.religions} />
            <TagGroup title="Philosophies" items={person.philosophies} />
            <TagGroup title="Treatment specialties" items={person.specialties} />
            <p className="text-sm text-muted">{DISCLAIMER}</p>
            <section className="space-y-3">
              <h2 className="font-display text-2xl">Reviews</h2>
              {query.data?.reviews.length ? (
                query.data.reviews.map((review) => (
                  <Panel key={review.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{review.reviewerName}</p>
                      <Stars value={review.stars} />
                    </div>
                    {review.comment ? <p className="mt-2 text-sm">{review.comment}</p> : null}
                  </Panel>
                ))
              ) : (
                <p className="text-sm text-muted">No reviews yet.</p>
              )}
            </section>
          </article>
          <BookCard counselorId={person.id} name={person.displayName} hourly={person.hourlyRateCents} />
        </div>
      ) : null}
    </Shell>
  );
}

function TagGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="text-sm text-muted">{title}</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-full border border-line bg-surface px-3 py-1 text-sm">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function BookCard({ counselorId, name, hourly }: { counselorId: string; name: string; hourly: number }) {
  const { user, isPending } = useCurrentUserState();
  const client = useQueryClient();
  const [duration, setDuration] = useState<DurationMin>(60);
  const [day, setDay] = useState("");
  const [slot, setSlot] = useState("");
  const [shareMood, setShareMood] = useState(false);
  const [ads, setAds] = useState(false);
  const [adLeft, setAdLeft] = useState(0);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedId, setBookedId] = useState<number | null>(null);
  const [holdNote, setHoldNote] = useState<string | null>(null);

  const slots = useQuery({
    queryKey: ["slots", counselorId, duration],
    queryFn: () => listSlots({ data: { counselorId, durationMin: duration } }),
  });
  const selectedDay = useMemo(
    () => slots.data?.find((item) => item.date === day) ?? slots.data?.[0],
    [slots.data, day],
  );
  const price = sessionPriceCents(hourly, duration, ads && adLeft === 0);

  useEffect(() => {
    if (!ads) return;
    const timer = window.setInterval(() => {
      setAdLeft((left) => {
        if (left <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return left - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [ads]);

  async function finish(method: WalletMethod, payStatus: "authorized" | "demo_authorized") {
    if (!slot) return;
    setBusy(true);
    setError(null);
    try {
      const result = await bookAppointment({
        data: {
          counselorId,
          startsAt: slot,
          durationMin: duration,
          shareMood,
          adsOptIn: ads,
          disclaimerAck: true,
          payMethod: method,
          payStatus,
        },
      });
      setBookedId(result.id);
      setHoldNote(payStatus === "demo_authorized" ? "No card was charged. Apple Pay and Google Pay charge only in the installed app." : null);
      await client.invalidateQueries({ queryKey: ["slots", counselorId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not book.");
    } finally {
      setBusy(false);
    }
  }

  async function pay(method: WalletMethod) {
    if (!ack || !slot) return;
    if (ads && adLeft > 0) return;
    setError(null);
    const outcome = await requestWallet({
      method,
      amountCents: price,
      label: `${duration} min with ${name}`,
    });
    if (outcome === "cancelled") return;
    if (outcome === "authorized") {
      await finish(method, "authorized");
      return;
    }
    await finish(method, "demo_authorized");
  }

  if (isPending) return <Panel>Checking your account…</Panel>;
  if (!user) {
    return (
      <Panel className="space-y-3 lg:sticky lg:top-20">
        <h2 className="font-display text-2xl">Book a visit</h2>
        <p className="text-sm text-muted">Sign in to choose a time and pay with Apple Pay or Google Pay.</p>
        <Link to="/login" className="inline-flex min-h-11 items-center rounded-full bg-spruce-deep px-4 text-sm text-surface">
          Sign in
        </Link>
      </Panel>
    );
  }
  if (bookedId) {
    return (
      <Panel className="space-y-3">
        <h2 className="font-display text-2xl">You are booked</h2>
        <p className="text-sm text-muted">
          {formatMoney(price)} for {duration} minutes. Open the room when you are ready.
        </p>
        {holdNote ? <p className="text-sm text-muted">{holdNote}</p> : null}
        <Link
          to="/session/$appointmentId"
          params={{ appointmentId: String(bookedId) }}
          className="inline-flex min-h-11 items-center rounded-full bg-spruce-deep px-4 text-sm text-surface"
        >
          Go to the visit
        </Link>
      </Panel>
    );
  }

  const adReady = !ads || adLeft === 0;
  return (
    <Panel className="min-w-0 space-y-4 lg:sticky lg:top-20">
      <div>
        <h2 className="font-display text-2xl">Book</h2>
        <p className="text-sm text-muted">
          {hoursLabel(duration)} × {formatMoney(hourly)} hour rate
          {ads && adReady ? " · 2% sponsor rate" : ""} = {formatMoney(price)}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {DURATIONS.map((minutes) => (
          <button
            key={minutes}
            type="button"
            onClick={() => {
              setDuration(minutes);
              setSlot("");
            }}
            className={cn(
              "min-h-11 rounded-2xl border text-sm transition-[background-color,border-color] duration-150",
              duration === minutes ? "border-spruce-deep bg-spruce-deep text-surface" : "border-line bg-paper",
            )}
          >
            {minutes}m
          </button>
        ))}
      </div>
      {slots.isLoading ? <p className="text-sm text-muted">Finding open times…</p> : null}
      <div className="flex w-full min-w-0 gap-2 overflow-x-auto pb-1">
        {slots.data?.map((item) => (
          <button
            key={item.date}
            type="button"
            onClick={() => {
              setDay(item.date);
              setSlot("");
            }}
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-3 text-sm",
              (selectedDay?.date ?? "") === item.date ? "border-spruce bg-spruce text-surface" : "border-line bg-paper",
            )}
          >
            {labelDate(item.date)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {selectedDay?.slots.slice(0, 18).map((iso) => (
          <button
            key={iso}
            type="button"
            onClick={() => setSlot(iso)}
            className={cn(
              "min-h-11 rounded-xl border text-sm",
              slot === iso ? "border-spruce-deep bg-spruce-deep text-surface" : "border-line bg-paper",
            )}
          >
            {labelTime(iso)}
          </button>
        ))}
      </div>
      {!slots.isLoading && !slots.data?.length ? <p className="text-sm text-muted">No open times in the next couple of weeks.</p> : null}
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={shareMood} onChange={(event) => setShareMood(event.target.checked)} className="mt-1 h-5 w-5 accent-spruce" />
        <span>Share mood notes I already marked as shareable with {name} for this visit.</span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={ads}
          onChange={(event) => {
            setAds(event.target.checked);
            setAdLeft(event.target.checked ? 4 : 0);
          }}
          className="mt-1 h-5 w-5 accent-spruce"
        />
        <span>Take 2% off by including a short sponsor. On iPhone and Android this spot is filled by X Ads.</span>
      </label>
      {ads ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper p-3 text-sm">
          <p className="text-xs tracking-wide text-muted uppercase">X Ads · Sponsored</p>
          <p className="mt-1 font-medium">A quiet minute from a local bookstore.</p>
          <p className="text-muted">{adLeft > 0 ? `Stay with this X Ad for ${adLeft}s to unlock the lower rate.` : "X Ad finished. The lower rate is on."}</p>
        </div>
      ) : null}
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} className="mt-1 h-5 w-5 accent-spruce" />
        <span>{DISCLAIMER}</span>
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="dark" disabled={!slot || !ack || !adReady || busy} onClick={() => void pay("apple_pay")}>
          {busy ? "Booking…" : "Apple Pay"}
        </Button>
        <Button type="button" variant="ghost" disabled={!slot || !ack || !adReady || busy} onClick={() => void pay("google_pay")}>
          {busy ? "Booking…" : "Google Pay"}
        </Button>
      </div>
      {error ? <p className="text-sm text-clay">{error}</p> : null}
    </Panel>
  );
}
