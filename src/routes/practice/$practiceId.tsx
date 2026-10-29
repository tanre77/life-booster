import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { SitTimer } from "@/components/sit-timer";
import { Shell } from "@/components/shell";
import { getPractice } from "@/lib/life/api";

export const Route = createFileRoute("/practice/$practiceId")({ component: PracticePage });

function PracticePage() {
  const { practiceId } = Route.useParams();
  const id = Number(practiceId);
  const query = useQuery({
    queryKey: ["practice", id],
    queryFn: () => getPractice({ data: { id } }),
    enabled: Number.isFinite(id) && id > 0,
  });
  const practice = query.data;

  return (
    <Shell>
      {query.isLoading ? <p className="text-muted">Opening the practice…</p> : null}
      {!query.isLoading && !practice ? <p className="text-muted">That practice is not in the library.</p> : null}
      {practice ? (
        <div className="mx-auto max-w-lg space-y-6">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-spruce uppercase">{practice.topic}</p>
            <h1 className="font-display text-4xl">{practice.title}</h1>
            <p className="mt-2 text-muted">
              {practice.minutes} min ·{" "}
              <Link to="/counselors/$counselorId" params={{ counselorId: practice.counselorId }} className="text-spruce-deep">
                {practice.counselorName}
              </Link>
            </p>
          </div>
          <SitTimer minutes={practice.minutes} label={practice.title} guidance={practice.body} />
          {practice.body ? <p className="text-sm leading-relaxed">{practice.body}</p> : null}
        </div>
      ) : null}
    </Shell>
  );
}
