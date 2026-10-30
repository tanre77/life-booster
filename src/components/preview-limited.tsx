import { Shell, Panel } from "@/components/shell";
import { hrefWithPreview } from "@/lib/life/preview-mode";

export function PreviewLimited() {
  return (
    <Shell>
      <div className="mx-auto grid max-w-xl gap-4">
        <div>
          <h1 className="font-display text-4xl">Sample journal only</h1>
          <p className="mt-2 text-muted">
            Preview mode does not open this page. Signing in, messages, payments, and account data
            stay off so a real journal is never read.
          </p>
        </div>
        <Panel className="space-y-3">
          <p className="text-sm">Messages are off in preview.</p>
          <p className="text-sm">Payments are off in preview.</p>
          <a
            href={hrefWithPreview("/")}
            className="inline-flex min-h-11 items-center rounded-full bg-spruce-deep px-4 text-sm font-medium text-surface"
          >
            Back to Alex&apos;s journal
          </a>
        </Panel>
      </div>
    </Shell>
  );
}
