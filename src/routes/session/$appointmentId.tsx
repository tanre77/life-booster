import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { VideoStage } from "@/components/video-room";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getSessionRoom, listMessages, postMessage } from "@/lib/life/api";
import { DISCLAIMER, MOODS } from "@/lib/life/catalog";

export const Route = createFileRoute("/session/$appointmentId")({ component: SessionPage });

function SessionPage() {
  const { appointmentId } = Route.useParams();
  const id = Number(appointmentId);
  const { user, isPending } = useCurrentUserState();
  const room = useQuery({
    queryKey: ["session", id],
    queryFn: () => getSessionRoom({ data: { id } }),
    enabled: Boolean(user) && Number.isFinite(id),
  });
  if (isPending) {
    return (
      <Shell>
        <p className="text-muted">Opening the room…</p>
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn />;
  if (room.isLoading || !room.data) {
    return (
      <Shell>
        {room.isLoading ? <p className="text-muted">Opening the room…</p> : null}
        {room.isError ? <p className="text-clay">{room.error instanceof Error ? room.error.message : "Could not open this visit."}</p> : null}
      </Shell>
    );
  }
  return <Room appointmentId={id} />;
}

function Room({ appointmentId }: { appointmentId: number }) {
  const room = useQuery({
    queryKey: ["session", appointmentId],
    queryFn: () => getSessionRoom({ data: { id: appointmentId } }),
  });
  const data = room.data;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const [body, setBody] = useState("");
  const client = useQueryClient();
  const messages = useQuery({
    queryKey: ["messages", appointmentId],
    queryFn: () => listMessages({ data: { id: appointmentId } }),
    refetchInterval: () => (document.hidden ? false : 3000),
  });

  if (!data) return null;
  const end = new Date(data.startsAt).getTime() + data.durationMin * 60 * 1000;
  const remaining = Math.max(0, end - now);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const clock = remaining === 0 ? "Time is up" : `${minutes}:${String(seconds).padStart(2, "0")}`;

  async function send() {
    const text = body.trim();
    if (!text) return;
    setBody("");
    await postMessage({ data: { id: appointmentId, body: text } });
    await client.invalidateQueries({ queryKey: ["messages", appointmentId] });
  }

  return (
    <VideoStage appointmentId={appointmentId} role={data.role} title={data.otherName} timer={clock} sheet={
      <div className="space-y-4">
        <section>
          <h2 className="font-display text-xl">Shared notes</h2>
          {!data.shareMood ? (
            <p className="mt-2 text-sm text-muted">Mood notes were not shared for this visit.</p>
          ) : data.notes.length ? (
            <ul className="mt-3 space-y-3">
              {data.notes.map((note) => (
                <li key={note.loggedOn}>
                  <p className="text-sm text-muted">
                    {note.loggedOn} · {MOODS.find((mood) => mood.value === note.mood)?.label}
                  </p>
                  <p className="text-sm">{note.note}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">Sharing is on, and there are no marked notes in this window.</p>
          )}
          <p className="mt-3 text-sm text-muted">{DISCLAIMER}</p>
        </section>
        <section className="flex min-h-80 flex-col rounded-card border border-line bg-surface">
          <h2 className="px-4 pt-4 font-display text-xl">Messages</h2>
          <ul className="mt-2 flex-1 space-y-2 overflow-y-auto px-4">
            {messages.data?.map((message) => (
              <li key={message.id} className={message.mine ? "text-right" : "text-left"}>
                <span className={message.mine ? "inline-block rounded-2xl bg-spruce-deep px-3 py-2 text-sm text-surface" : "inline-block rounded-2xl bg-paper px-3 py-2 text-sm"}>
                  {message.body}
                </span>
              </li>
            ))}
          </ul>
          <form
            className="flex gap-2 border-t border-line p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <input
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write a message"
              className="min-h-11 flex-1 rounded-full border border-line bg-paper px-3"
            />
            <button type="submit" className="min-h-11 rounded-full bg-spruce-deep px-4 text-sm text-surface">
              Send
            </button>
          </form>
        </section>
      </div>
    } />
  );
}
