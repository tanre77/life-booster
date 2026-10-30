import { PREVIEW_EXIT_HREF } from "@/lib/life/preview-mode";

export function PreviewModeBanner() {
  return (
    <div
      data-testid="preview-mode-banner"
      className="border-b border-white/10 bg-spruce-deep text-surface"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-2">
        <p className="text-sm">
          <span className="font-display text-base">Preview mode</span>
          <span className="text-surface/80">
            {" "}
            — sample journal only. Alex, January 5–15. Messages and payments are off.
          </span>
        </p>
        <a
          href={PREVIEW_EXIT_HREF}
          className="inline-flex min-h-11 items-center rounded-full bg-surface px-4 text-sm font-medium text-spruce-deep"
        >
          Exit
        </a>
      </div>
    </div>
  );
}
