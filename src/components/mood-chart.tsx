import { MOODS } from "@/lib/life/catalog";
import { cn } from "@/lib/utils";
import { useState } from "react";

const BAR = ["", "bg-clay", "bg-clay/70", "bg-spruce/55", "bg-spruce", "bg-spruce-deep"];

export function MoodChart({
  points,
  selected,
  onPick,
}: {
  points: { label: string; mood: number | null; date?: string }[];
  selected?: string;
  onPick?: (date: string) => void;
}) {
  const [tip, setTip] = useState<string | null>(null);
  return (
    <div className="w-full">
      <div className="flex h-44 items-end gap-2">
        {points.map((point) => {
          const mood = point.mood ?? 0;
          const name = MOODS.find((item) => item.value === point.mood)?.label;
          const on = point.date && point.date === selected;
          return (
            <button
              key={point.date ?? point.label}
              type="button"
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
              onClick={() => {
                setTip(point.mood == null ? `${point.label}: not logged` : `${point.label}: ${name ?? ""}`);
                if (point.date && onPick) onPick(point.date);
              }}
            >
              <span
                className={cn("w-full max-w-8 rounded-t-lg", mood ? BAR[mood] : "bg-line", on && "ring-2 ring-ink ring-offset-2 ring-offset-surface")}
                style={{ height: mood ? `${18 + (mood / 5) * 82}%` : "6px" }}
              />
              <span className={cn("text-xs", on ? "font-medium text-ink" : "text-muted")}>{point.label}</span>
            </button>
          );
        })}
      </div>
      {tip ? <p className="mt-2 text-xs text-muted">{tip}</p> : null}
    </div>
  );
}
