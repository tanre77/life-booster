import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { listSignals, postSignal, touchPresence } from "@/lib/life/api";
import { Button } from "@/components/shell";

const PROMPTS = [
  "How has this week felt, in one sentence?",
  "What do you want a little more of in the next few days?",
  "What would be useful to ask for?",
];

export function VideoStage({
  appointmentId,
  role,
}: {
  appointmentId: number;
  role: "member" | "counselor" | "solo";
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [camNote, setCamNote] = useState<string | null>(null);
  const [phase, setPhase] = useState("Camera is off until you start.");
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!started) return;
    let stopped = false;
    let timer = 0;
    const solo = role === "solo";
    const pc = solo
      ? null
      : new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    const pendingIce: RTCIceCandidateInit[] = [];
    let afterId = 0;
    let offered = false;
    let answered = false;

    const stopStream = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    async function flushIce() {
      if (!pc?.remoteDescription) return;
      while (pendingIce.length) {
        const candidate = pendingIce.shift();
        if (candidate) {
          try {
            await pc.addIceCandidate(candidate);
          } catch {
            /* a late candidate should not kill the visit */
          }
        }
      }
    }

    async function boot() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;
        stream.getTracks().forEach((track) => pc?.addTrack(track, stream));
        setPhase(solo ? "Your camera is on. This sample guide is not a live person." : "Camera on.");
      } catch {
        if (!stopped) {
          setCamNote("Camera and microphone stayed off. Messages and shared notes still work.");
          setPhase(solo ? "Practice room, without a camera." : "Waiting without a camera.");
        }
      }
    }

    if (pc) {
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (remoteRef.current && stream) remoteRef.current.srcObject = stream;
        setPhase("Picture connected.");
      };
      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        void postSignal({
          data: { id: appointmentId, kind: "ice", payload: JSON.stringify(event.candidate) },
        }).catch(() => undefined);
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setPhase("Picture connected.");
        if (pc.connectionState === "failed") setPhase("Live picture did not open. Keep talking in messages.");
      };
    }

    async function tick() {
      if (stopped || !pc) return;
      try {
        const presence = await touchPresence({ data: { id: appointmentId } });
        if (presence.peer && role === "member" && !offered && pc.signalingState === "stable") {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await postSignal({
            data: { id: appointmentId, kind: "offer", payload: JSON.stringify(pc.localDescription) },
          });
          offered = true;
          setPhase("Reaching their camera…");
        } else if (!presence.peer && role === "member" && !offered) {
          setPhase("Waiting for them to open this visit.");
        } else if (role === "counselor" && !answered) {
          setPhase(presence.peer ? "They are here. Connecting picture…" : "You are in the room.");
        }
        const signals = await listSignals({ data: { id: appointmentId, afterId } });
        for (const signal of signals) {
          afterId = Math.max(afterId, signal.id);
          if (signal.kind === "offer" && role === "counselor" && !answered) {
            await pc.setRemoteDescription(JSON.parse(signal.payload) as RTCSessionDescriptionInit);
            await flushIce();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await postSignal({
              data: { id: appointmentId, kind: "answer", payload: JSON.stringify(pc.localDescription) },
            });
            answered = true;
          } else if (signal.kind === "answer" && role === "member") {
            await pc.setRemoteDescription(JSON.parse(signal.payload) as RTCSessionDescriptionInit);
            await flushIce();
          } else if (signal.kind === "ice") {
            const candidate = JSON.parse(signal.payload) as RTCIceCandidateInit;
            if (!pc.remoteDescription) pendingIce.push(candidate);
            else await pc.addIceCandidate(candidate);
          }
        }
      } catch {
        /* signaling can retry on the next tick */
      }
      if (!stopped) timer = window.setTimeout(() => void tick(), document.hidden ? 5000 : 1600);
    }

    void boot();
    if (pc) void tick();
    else setPhase("Practice room. A sample profile is not live on video.");

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stopStream();
      pc?.close();
      if (localRef.current) localRef.current.srcObject = null;
      if (remoteRef.current) remoteRef.current.srcObject = null;
    };
  }, [appointmentId, role, started]);

  function toggleMute() {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }

  function toggleCamera() {
    const next = !cameraOn;
    streamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCameraOn(next);
  }

  return (
    <div className="overflow-hidden rounded-card border border-line bg-spruce-deep text-surface">
      <div className="relative aspect-[4/3] bg-ink sm:aspect-video">
        {role !== "solo" ? (
          <video ref={remoteRef} autoPlay playsInline className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col justify-end gap-2 p-4">
            {PROMPTS.map((prompt) => (
              <p key={prompt} className="max-w-sm text-sm text-surface/90">
                {prompt}
              </p>
            ))}
          </div>
        )}
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-3 right-3 h-24 w-32 rounded-2xl border border-surface/30 bg-ink object-cover shadow-lg sm:h-28 sm:w-40"
        />
        {!started ? (
          <div className="absolute inset-0 grid place-items-center bg-spruce-deep/80 p-4 text-center">
            <div className="space-y-3">
              <p className="text-sm text-surface/90">{phase}</p>
              <Button type="button" variant="dark" className="bg-surface text-ink hover:bg-paper" onClick={() => setStarted(true)}>
                Start video
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <p className="text-sm text-surface/85">{camNote ?? phase}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleMute}
            disabled={!started}
            className="grid h-11 w-11 place-items-center rounded-full bg-surface/15 text-surface disabled:opacity-40"
            aria-label={muted ? "Unmute microphone" : "Mute microphone"}
          >
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={toggleCamera}
            disabled={!started}
            className="grid h-11 w-11 place-items-center rounded-full bg-surface/15 text-surface disabled:opacity-40"
            aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
          >
            {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
