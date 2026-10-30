import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button, Panel, Shell, fieldClass } from "@/components/shell";
import { GROK_PROVIDERS, authClient, captureSessionToken, signIn } from "@/lib/auth/client";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { hrefWithPreview } from "@/lib/life/preview-mode";
import { useIsPreviewMode } from "@/lib/life/use-preview-mode";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const preview = useIsPreviewMode();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (preview) {
    return (
      <Shell>
        <div className="mx-auto grid max-w-md gap-4">
          <h1 className="font-display text-4xl">Preview mode</h1>
          <p className="text-muted">No sign-in. This preview uses Alex&apos;s sample journal and does not open an account.</p>
          <a href={hrefWithPreview("/")} className="inline-flex min-h-11 items-center justify-center rounded-full bg-spruce-deep px-4 text-sm font-medium text-surface">
            Back to the sample journal
          </a>
        </div>
      </Shell>
    );
  }

  if (!isPending && user) return <RedirectToSignIn to="/" />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const fetchOptions = {
      onSuccess(context: { response: Response }) {
        captureSessionToken(context.response.headers);
      },
    };
    const result =
      mode === "up"
        ? await authClient.signUp.email({
            email,
            password,
            name: name.trim() || email.split("@")[0] || "Member",
            callbackURL: "/",
            fetchOptions,
          })
        : await authClient.signIn.email({ email, password, callbackURL: "/", fetchOptions });
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? (mode === "up" ? "Could not create the account." : "Could not sign in."));
      return;
    }
    try {
      await authClient.getSession();
    } catch {
      /* the stored token is enough for the next page */
    }
    await navigate({ to: "/" });
  }

  async function onProvider(providerId: string) {
    setError(null);
    try {
      await signIn(providerId, { callbackURL: "/" });
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    }
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
              onClick={() => void onProvider(provider.providerId)}
            >
              Continue with {provider.label}
            </Button>
          ))}
          <p className="text-sm text-muted">Apple ID is not offered here. The sign-in service only accepts Google and X. Use one of those, or create an account with email.</p>
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
