import { useEffect, useState } from "react";
import { Button } from "@/components/shell";

export function SitTimer({
  minutes,
  label,
  guidance,
}: {
  minutes: number;
  label: string;
  guidance?: string;
}) {
  const [left, setLeft] = useState(minutes * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!running || left <= 0) return;
    const id = window.setInterval(() => {
      setLeft((current) => {
        if (current <= 1) {
          setRunning(false);
          setDone(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, left]);

  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-3">
      <p className="font-display text-5xl tabular-nums">{clock}</p>
      <p className="text-sm text-muted">{done ? "Sit complete." : label}</p>
      {guidance && running ? <p className="max-w-prose text-sm">{guidance}</p> : null}
      <div className="flex gap-2">
        <Button type="button" onClick={() => setRunning((value) => !value)} disabled={done}>
          {running ? "Pause" : left === minutes * 60 ? "Start sit" : "Resume"}
        </Button>
        {left !== minutes * 60 ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setRunning(false);
              setDone(false);
              setLeft(minutes * 60);
            }}
          >
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  );
}
