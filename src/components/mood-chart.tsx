import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MOODS } from "@/lib/life/catalog";

export function MoodChart({ points }: { points: { label: string; mood: number | null }[] }) {
  const data = points.map((point) => ({ label: point.label, mood: point.mood ?? 0, empty: point.mood == null }));
  return (
    <div className="h-40 w-full text-spruce">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="28%">
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#5e675f", fontSize: 12 }} />
          <YAxis domain={[0, 5]} hide />
          <Tooltip
            cursor={{ fill: "rgba(30,107,88,0.08)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as { mood: number; empty: boolean; label: string };
              if (row.empty) return null;
              const name = MOODS.find((mood) => mood.value === row.mood)?.label ?? "";
              return (
                <div className="rounded-xl border border-line bg-surface px-2 py-1 text-xs text-ink">
                  {row.label}: {name}
                </div>
              );
            }}
          />
          <Bar dataKey="mood" fill="currentColor" radius={[8, 8, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
