import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/shell";
import { VideoStage } from "@/components/video-room";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getSessionRoom, listMessages, postMessage } from "@/lib/life/api";
import type { SessionRoom } from "@/lib/life/types";
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
  return <Room appointmentId={id} data={room.data} />;
}

function Room({ appointmentId, data }: { appointmentId: number; data: SessionRoom }) {
  const [body, setBody] = useState("");
  const client = useQueryClient();
  const messages = useQuery({
    queryKey: ["messages", appointmentId],
    queryFn: () => listMessages({ data: { id: appointmentId } }),
    refetchInterval: () => (document.hidden ? false : 4000),
  });

  async function send() {
    const text = body.trim();
    if (!text) return;
    setBody("");
    await postMessage({ data: { id: appointmentId, body: text } });
    await client.invalidateQueries({ queryKey: ["messages", appointmentId] });
  }

  return (
    <VideoStage appointmentId={appointmentId} role={data.role} title={data.otherName} durationMin={data.durationMin} sheet={
      <div className="space-y-4">
        <section>
          <h2 className="font-display text-xl">Shared notes</h2>
          {!data.shareMood ? (
            <p className="mt-2 text-sm text-muted">Mood notes and medications were not shared for this visit.</p>
          ) : (
            <>
              {data.medications.length ? (
                <ul className="mt-3 space-y-2">
                  <li className="text-sm text-muted">Medications they marked to share</li>
                  {data.medications.map((item) => (
                    <li key={item.name + item.dose + item.taken} className="text-sm">
                      <span className="font-medium">{item.name}</span>
                      {[item.dose, item.taken].filter(Boolean).length ? (
                        <span className="text-muted"> · {[item.dose, item.taken].filter(Boolean).join(" · ")}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">No medications were marked to share.</p>
              )}
              {data.notes.length ? (
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
            </>
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
