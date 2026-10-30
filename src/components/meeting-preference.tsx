import type { MeetingProviderId } from "@/lib/life/meetings";
import { meetingProviderLabel } from "@/lib/life/meetings";
import { cn } from "@/lib/utils";

const OPTIONS: MeetingProviderId[] = ["google_meet", "zoom"];

export function MeetingPreference({
  value,
  onChange,
  disabled,
}: {
  value: MeetingProviderId;
  onChange: (next: MeetingProviderId) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Video meeting provider" className="grid grid-cols-2 gap-2">
      {OPTIONS.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option)}
            className={cn(
              "min-h-11 rounded-full border text-sm",
              selected
                ? "border-spruce-deep bg-spruce-deep text-surface"
                : "border-line bg-paper text-ink",
            )}
          >
            {meetingProviderLabel(option)}
          </button>
        );
      })}
    </div>
  );
}
