import { MOODS } from "@/lib/life/catalog";
import { useState } from "react";

export function MoodChart({ points }: { points: { label: string; mood: number | null }[] }) {
  const [tip, setTip] = useState<string | null>(null);
  return (
    <div className="w-full">
      <div className="flex h-40 items-end gap-2">
        {points.map((point) => {
          const mood = point.mood ?? 0;
          const name = MOODS.find((item) => item.value === point.mood)?.label;
          return (
            <button
              key={point.label}
              type="button"
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
              onClick={() => setTip(point.mood == null ? null : `${point.label}: ${name ?? ""}`)}
            >
              <span
                className="w-full max-w-7 rounded-t-lg bg-spruce"
                style={{ height: mood ? `${(mood / 5) * 100}%` : "4px", opacity: mood ? 1 : 0.25 }}
              />
              <span className="text-xs text-muted">{point.label}</span>
            </button>
          );
        })}
      </div>
      {tip ? <p className="mt-2 text-xs text-muted">{tip}</p> : null}
    </div>
  );
}
