import { useEffect } from "react";
import { installPreviewNetworkGuard } from "@/lib/life/preview-mode";
import { useIsPreviewMode } from "@/lib/life/use-preview-mode";

/** Blocks account reads and writes for as long as preview mode is on. */
export function PreviewNetworkGuard() {
  const preview = useIsPreviewMode();
  useEffect(() => {
    if (!preview) return;
    return installPreviewNetworkGuard();
  }, [preview]);
  return null;
}
