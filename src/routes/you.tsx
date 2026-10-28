import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, Panel, Shell, fieldClass } from "@/components/shell";
import { UserButton } from "@/lib/auth/gates";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getDashboard, saveDisplayName } from "@/lib/life/api";
import { DISCLAIMER } from "@/lib/life/catalog";
import { localYMD } from "@/lib/life/time";
import { applyTheme, readThemeChoice, type ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/you")({ component: YouPage });

function ThemeSwitch() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  useEffect(() => {
    setChoice(readThemeChoice());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readThemeChoice() === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  const options: { id: ThemeChoice; label: string }[] = [
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
    { id: "system", label: "Match device" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={choice === option.id}
          onClick={() => {
            applyTheme(option.id);
            setChoice(option.id);
          }}
          className={cn(
            "min-h-11 rounded-full border text-sm",
            choice === option.id ? "border-spruce-deep bg-spruce-deep text-surface" : "border-line bg-paper text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function YouPage() {
  const { user, isPending } = useCurrentUserState();
  const today = localYMD();
  const dashboard = useQuery({
    queryKey: ["dashboard", today],
    queryFn: () => getDashboard({ data: { today, suggestedName: user?.displayName ?? "" } }),
    enabled: Boolean(user),
  });
  const [name, setName] = useState("");
  const [primed, setPrimed] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const client = useQueryClient();
  if (dashboard.data && !primed) {
    setName(dashboard.data.profile.displayName || user?.displayName || "");
    setPrimed(true);
  }
  if (isPending) {
    return (
      <Shell>
        <p className="text-muted">Opening your account…</p>
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn />;
  const desk = dashboard.data?.profile;
  return (
    <Shell>
      <div className="mx-auto max-w-xl space-y-5">
        <h1 className="font-display text-4xl">You</h1>
        <Panel className="space-y-3">
          <h2 className="font-display text-2xl">Appearance</h2>
          <ThemeSwitch />
        </Panel>
        <Panel className="space-y-3">
          <UserButton />
          <p className="text-sm text-muted">{user.primaryEmail}</p>
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              void saveDisplayName({ data: { displayName: name } })
                .then(async () => {
                  setStatus("Name saved.");
                  await client.invalidateQueries({ queryKey: ["dashboard", today] });
                })
                .catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Could not save."));
            }}
          >
            <label className="block text-sm">
              <span className="text-muted">Name on reviews and visits</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
            </label>
            <Button type="submit">Save name</Button>
          </form>
          {status ? <p className="text-sm text-muted">{status}</p> : null}
        </Panel>
        <Panel className="space-y-2">
          <h2 className="font-display text-2xl">Counselor studio</h2>
          <p className="text-sm text-muted">
            {desk && dashboard.data?.counselor
              ? dashboard.data.counselor.standing === "dismissed"
                ? "Your profile was dismissed."
                : "Your bio is live when you have open hours."
              : "Offer conversations. You will list religions, philosophies, specialties, and an hourly rate."}
          </p>
          <Link to="/studio" className="inline-flex min-h-11 items-center text-sm font-medium text-spruce-deep">
            Open studio
          </Link>
        </Panel>
        <Panel className="space-y-2">
          <h2 className="font-display text-2xl">Life Booster desk</h2>
          <p className="text-sm text-muted">Operators can dismiss any counselor without notice. Future visits are cancelled.</p>
          {desk?.isOperator ? (
            <Link to="/desk" className="inline-flex text-sm font-medium text-spruce-deep">
              Open the desk
            </Link>
          ) : desk && !desk.deskClaimed ? (
            <Link to="/desk" className="inline-flex text-sm font-medium text-spruce-deep">
              Take the desk
            </Link>
          ) : (
            <p className="text-sm text-muted">The desk already has an operator.</p>
          )}
        </Panel>
        <p className="text-sm text-muted">{DISCLAIMER}</p>
      </div>
    </Shell>
  );
}
