import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, PenLine, SunMedium, UserRound, Users } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Today", icon: SunMedium, exact: true },
  { to: "/counselors", label: "People", icon: Users, exact: false },
  { to: "/visits", label: "Visits", icon: CalendarDays, exact: false },
  { to: "/studio", label: "Studio", icon: PenLine, exact: false },
  { to: "/you", label: "You", icon: UserRound, exact: false },
] as const;

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="10" fill="currentColor" />
      <circle cx="16" cy="13" r="5" fill="#fffdf8" />
      <circle cx="16" cy="13" r="2" fill="#c4623e" />
      <path d="M6 24c3.2-4 6.4-6 10-6s6.8 2 10 6" fill="none" stroke="#fffdf8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const path = useRouterState({ select: (state) => state.location.pathname });
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 text-spruce-deep">
            <Mark className="h-8 w-8" />
            <span className="font-display text-lg leading-none">Life Booster</span>
          </Link>
          {user ? (
            <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
              {TABS.map((tab) => {
                const active = tab.exact ? path === tab.to : path === tab.to || path.startsWith(`${tab.to}/`);
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    className={cn(
                      "rounded-full px-3 py-2 text-sm transition-[background-color,color] duration-150",
                      active ? "bg-spruce-deep text-surface" : "text-muted hover:bg-surface hover:text-ink",
                    )}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          ) : !isPending ? (
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center rounded-full bg-spruce-deep px-4 text-sm font-medium text-surface"
            >
              Sign in
            </Link>
          ) : (
            <span className="h-8 w-20 animate-pulse rounded-full bg-line" />
          )}
        </div>
      </header>
      <main className={cn("mx-auto w-full max-w-5xl px-4 pt-6", user ? "pb-28 md:pb-12" : "pb-16")}>{children}</main>
      {user ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur-md md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          aria-label="Primary"
        >
          <ul className="mx-auto grid max-w-lg grid-cols-5">
            {TABS.map((tab) => {
              const active = tab.exact ? path === tab.to : path === tab.to || path.startsWith(`${tab.to}/`);
              const Icon = tab.icon;
              return (
                <li key={tab.to}>
                  <Link
                    to={tab.to}
                    className={cn(
                      "flex min-h-16 flex-col items-center justify-center gap-1 text-xs",
                      active ? "text-spruce-deep" : "text-muted",
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-card border border-line bg-surface p-4 shadow-[0_1px_0_rgba(27,36,32,0.04)]", className)}>
      {children}
    </section>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "dark" }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        variant === "primary" && "bg-spruce-deep text-surface hover:bg-spruce",
        variant === "dark" && "bg-ink text-surface hover:bg-spruce-deep",
        variant === "ghost" && "border border-line bg-surface text-ink hover:bg-paper",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export const fieldClass =
  "min-h-11 w-full rounded-2xl border border-line bg-paper px-3 text-base text-ink outline-none transition-[border-color] duration-150 focus-visible:border-spruce";
