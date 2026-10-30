import { useRouterState } from "@tanstack/react-router";
import { loadDemoJournal } from "@/lib/life/demo-journal";
import { isPreviewMode } from "@/lib/life/preview-flags";
import type { JournalEntry } from "@/lib/life/types";

function viteFlag(
  name: "VITE_LIFE_BOOSTER_DEMO" | "VITE_LIFE_BOOSTER_PREVIEW",
): string | undefined {
  const value = import.meta.env[name];
  return typeof value === "string" ? value : undefined;
}

export function useIsPreviewMode(): boolean {
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });
  const preview = useRouterState({
    select: (state) => (state.location.search as { preview?: unknown }).preview,
  });
  return isPreviewMode({
    VITE_LIFE_BOOSTER_PREVIEW: viteFlag("VITE_LIFE_BOOSTER_PREVIEW"),
    search: searchStr,
    preview,
  });
}

/** Demo journal entries, including when preview mode extends demo mode. */
export function useSampleJournal(): JournalEntry[] {
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });
  const search = useRouterState({
    select: (state) => state.location.search as { demo?: unknown; preview?: unknown },
  });
  return loadDemoJournal({
    VITE_LIFE_BOOSTER_DEMO: viteFlag("VITE_LIFE_BOOSTER_DEMO"),
    VITE_LIFE_BOOSTER_PREVIEW: viteFlag("VITE_LIFE_BOOSTER_PREVIEW"),
    search: searchStr,
    demo: search.demo,
    preview: search.preview,
  });
}
