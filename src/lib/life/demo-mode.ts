export type Env = Record<string, string | undefined>;

/** `VITE_LIFE_BOOSTER_DEMO=1` or `LIFE_BOOSTER_DEMO=1`. */
export function demoFromEnv(env: Env): boolean {
  return env.VITE_LIFE_BOOSTER_DEMO === "1" || env.LIFE_BOOSTER_DEMO === "1";
}

/** Page search (`?demo=1`) or the Vite flag. */
export function isDemoMode(search: string, envFlag?: string): boolean {
  if (envFlag === "1") return true;
  const text = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(text).get("demo") === "1";
}

/** Server functions honor an explicit request and the process environment. */
export function resolveDemo(requested: boolean, env: Env): boolean {
  return requested || demoFromEnv(env);
}
