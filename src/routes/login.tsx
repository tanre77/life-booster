import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button, Panel, Shell, fieldClass } from "@/components/shell";
import { GROK_PROVIDERS, authClient, signIn } from "@/lib/auth/client";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isPending && user) return <RedirectToSignIn to="/" />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result =
      mode === "up"
        ? await authClient.signUp.email({
            email,
            password,
            name: name.trim() || email.split("@")[0] || "Member",
            callbackURL: "/",
          })
        : await authClient.signIn.email({ email, password, callbackURL: "/" });
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "Could not sign in.");
      return;
    }
    await navigate({ to: "/" });
  }

  return (
    <Shell>
      <div className="mx-auto grid max-w-md gap-6">
        <div>
          <h1 className="font-display text-4xl">Come in</h1>
          <p className="mt-2 text-muted">Your week, your notes, and your visits stay on your account.</p>
        </div>
        <Panel className="space-y-3">
          {GROK_PROVIDERS.map((provider) => (
            <Button
              key={provider.providerId}
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => void signIn(provider.providerId, { callbackURL: "/" })}
            >
              Continue with {provider.label}
            </Button>
          ))}
        </Panel>
        <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
          <div className="flex gap-2">
            <Button type="button" variant={mode === "up" ? "primary" : "ghost"} onClick={() => setMode("up")}>
              Create account
            </Button>
            <Button type="button" variant={mode === "in" ? "primary" : "ghost"} onClick={() => setMode("in")}>
              I have one
            </Button>
          </div>
          {mode === "up" ? (
            <label className="block space-y-1 text-sm">
              <span className="text-muted">Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} autoComplete="name" />
            </label>
          ) : null}
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
              autoComplete="email"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Password</span>
            <input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={fieldClass}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
            />
          </label>
          {error ? <p className="text-sm text-clay">{error}</p> : null}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Working…" : mode === "up" ? "Create account" : "Sign in"}
          </Button>
        </form>
      </div>
    </Shell>
  );
}
