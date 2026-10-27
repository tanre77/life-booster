import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button, Panel, Shell } from "@/components/shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { claimDesk, getDashboard, listDesk, setCounselorStanding } from "@/lib/life/api";
import { formatMoney } from "@/lib/life/money";
import { localYMD } from "@/lib/life/time";

export const Route = createFileRoute("/desk")({ component: DeskPage });

function DeskPage() {
  const { user, isPending } = useCurrentUserState();
  const today = localYMD();
  const dashboard = useQuery({
    queryKey: ["dashboard", today],
    queryFn: () => getDashboard({ data: { today, suggestedName: user?.displayName ?? "" } }),
    enabled: Boolean(user),
  });
  if (isPending || (user && dashboard.isLoading)) {
    return (
      <Shell>
        <p className="text-muted">Opening the desk…</p>
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn />;
  const profile = dashboard.data?.profile;
  if (!profile?.isOperator) {
    return (
      <Shell>
        <Panel className="max-w-lg space-y-3">
          <h1 className="font-display text-3xl">Life Booster desk</h1>
          {profile && !profile.deskClaimed ? (
            <>
              <p className="text-sm text-muted">No operator yet. Taking the desk lets you dismiss any counselor without notice.</p>
              <Claim />
            </>
          ) : (
            <p className="text-sm text-muted">This desk already belongs to an operator.</p>
          )}
        </Panel>
      </Shell>
    );
  }
  return (
    <Shell>
      <DeskList />
    </Shell>
  );
}

function Claim() {
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        type="button"
        onClick={() => {
          void claimDesk()
            .then(() => client.invalidateQueries({ queryKey: ["dashboard"] }))
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not claim the desk."));
        }}
      >
        Take the desk
      </Button>
      {error ? <p className="mt-2 text-sm text-clay">{error}</p> : null}
    </div>
  );
}

function DeskList() {
  const query = useQuery({ queryKey: ["desk"], queryFn: () => listDesk() });
  const client = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, standing: "active" | "dismissed") {
    setError(null);
    await setCounselorStanding({ data: { id, standing } });
    setPending(null);
    await client.invalidateQueries({ queryKey: ["desk"] });
    await client.invalidateQueries({ queryKey: ["counselors"] });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-4xl">Desk</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Dismiss a counselor without notifying them first. They leave the directory immediately and future visits are cancelled. Life Booster is not liable for their advice.
        </p>
      </div>
      {query.isLoading ? <p className="text-muted">Loading profiles…</p> : null}
      {error ? <p className="text-sm text-clay">{error}</p> : null}
      <div className="grid gap-3">
        {query.data?.map((person) => (
          <Panel key={person.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {person.displayName}{" "}
                <span className="text-sm font-normal text-muted">{person.standing === "dismissed" ? "Dismissed" : "Active"}</span>
              </p>
              <p className="text-sm text-muted">
                {formatMoney(person.hourlyRateCents)}/hr · {person.specialties.join(", ")}
              </p>
            </div>
            {person.standing === "active" ? (
              pending === person.id ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="dark"
                    onClick={() =>
                      void act(person.id, "dismissed").catch((err: unknown) =>
                        setError(err instanceof Error ? err.message : "Could not dismiss."),
                      )
                    }
                  >
                    Dismiss now
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setPending(null)}>
                    Keep
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="ghost" onClick={() => setPending(person.id)}>
                  Dismiss without notice
                </Button>
              )
            ) : (
              <Button type="button" onClick={() => void act(person.id, "active").catch(() => setError("Could not restore."))}>
                Restore
              </Button>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}
