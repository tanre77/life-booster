import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({
  value,
  onChange,
  label = "Rating",
}: {
  value: number;
  onChange?: (value: number) => void;
  label?: string;
}) {
  const stars = [1, 2, 3, 4, 5];
  if (!onChange) {
    return (
      <span className="inline-flex items-center gap-0.5" aria-label={`${value} of 5 stars`}>
        {stars.map((star) => (
          <Star
            key={star}
            className={cn("h-4 w-4", star <= Math.round(value) ? "fill-clay text-clay" : "text-line")}
            strokeWidth={1.6}
          />
        ))}
      </span>
    );
  }
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={label}>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          onClick={() => onChange(star)}
          className="grid h-11 w-11 place-items-center rounded-full transition-[transform,background-color] duration-150 hover:bg-paper active:scale-95"
        >
          <Star className={cn("h-6 w-6", star <= value ? "fill-clay text-clay" : "text-line")} strokeWidth={1.6} />
        </button>
      ))}
    </div>
  );
}
