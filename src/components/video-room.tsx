import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MessageSquare, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { listSignals, postSignal, touchPresence } from "@/lib/life/api";
import { Button } from "@/components/shell";

async function openCamera(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    { video: { facingMode: "user" }, audio: true },
    { video: true, audio: true },
    { video: { facingMode: "user" }, audio: false },
    { video: true, audio: false },
  ];
  let last: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      last = error;
    }
  }
  throw last;
}

function attach(video: HTMLVideoElement | null, stream: MediaStream | null) {
  if (!video) return;
  video.srcObject = stream;
  if (stream) void video.play().catch(() => undefined);
}

export function VideoStage({
  appointmentId,
  role,
  title,
  timer,
  sheet,
}: {
  appointmentId: number;
  role: "member" | "counselor" | "solo";
  title: string;
  timer: string;
  sheet: ReactNode;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [camNote, setCamNote] = useState<string | null>(null);
  const [phase, setPhase] = useState("Camera is off until you start.");
  const [remoteLive, setRemoteLive] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const navigate = useNavigate();

  function leave() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void navigate({ to: "/visits" });
  }

  useEffect(() => {
    if (!started) return;
    let stopped = false;
    let timerId = 0;
    const solo = role === "solo";
    const pc = solo
      ? null
      : new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun.cloudflare.com:3478" }] });
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
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!stopped) {
          setCamNote("This phone browser blocked the camera. Open the visit in Safari, then tap Start video.");
          setPhase("Camera is unavailable here.");
        }
        return;
      }
      try {
        const stream = await openCamera();
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        attach(localRef.current, stream);
        stream.getTracks().forEach((track) => pc?.addTrack(track, stream));
        setPhase("Camera on. Your counselor will be joining soon.");
      } catch {
        if (!stopped) {
          setCamNote("Camera and microphone stayed off. Allow them in the phone settings, then start again. Messages still work.");
          setPhase("Waiting without a camera. Your counselor will be joining soon.");
        }
      }
    }

    if (pc) {
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          attach(remoteRef.current, stream);
          setRemoteLive(true);
          setPhase("Picture connected.");
        }
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
      if (!stopped) timerId = window.setTimeout(() => void tick(), document.hidden ? 5000 : 1600);
    }

    void boot();
    if (pc) void tick();
    else setPhase("Your counselor will be joining soon.");

    return () => {
      stopped = true;
      window.clearTimeout(timerId);
      stopStream();
      pc?.close();
      attach(localRef.current, null);
      attach(remoteRef.current, null);
      setRemoteLive(false);
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
    <div className="fixed inset-0 z-30 bg-ink text-surface">
      <video
        ref={remoteRef}
        autoPlay
        playsInline
        className={remoteLive ? "absolute inset-0 h-full w-full object-cover" : "hidden"}
      />
      <video
        ref={localRef}
        autoPlay
        playsInline
        muted
        className={
          remoteLive
            ? "absolute right-4 z-10 h-40 w-28 -scale-x-100 rounded-2xl border border-surface/30 bg-ink object-cover shadow-lg"
            : "absolute inset-0 h-full w-full -scale-x-100 object-cover"
        }
        style={remoteLive ? { bottom: "calc(env(safe-area-inset-bottom) + 6.5rem)" } : undefined}
      />
      <div
        className="absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 bg-gradient-to-b from-ink/70 to-transparent px-4 pb-10"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <div className="flex min-w-0 items-start gap-2">
          <button
            type="button"
            onClick={leave}
            className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface/15 text-surface"
            aria-label="Leave video"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs text-surface/75">Video visit</p>
            <h1 className="truncate font-display text-3xl">{title}</h1>
            <p className="text-sm text-surface/85">{camNote ?? phase}</p>
          </div>
        </div>
        <p className="shrink-0 font-display text-3xl tabular-nums">{timer}</p>
      </div>
      {!started ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-spruce-deep/85 p-6 text-center">
          <div className="max-w-xs space-y-3">
            <p className="text-sm text-surface/90">
              This will be a live person. Your counselor will be joining soon. Your camera starts when you tap.
            </p>
            <Button type="button" variant="dark" className="bg-surface text-ink hover:bg-paper" onClick={() => setStarted(true)}>
              Start video
            </Button>
          </div>
        </div>
      ) : null}
      <div
        className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-t from-ink/80 to-transparent px-4 pt-10"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="grid h-12 w-12 place-items-center rounded-full bg-surface/15 text-surface"
          aria-label="Open messages and notes"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleMute}
            disabled={!started}
            className="grid h-12 w-12 place-items-center rounded-full bg-surface/15 text-surface disabled:opacity-40"
            aria-label={muted ? "Unmute microphone" : "Mute microphone"}
          >
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={toggleCamera}
            disabled={!started}
            className="grid h-12 w-12 place-items-center rounded-full bg-surface/15 text-surface disabled:opacity-40"
            aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
          >
            {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {sheetOpen ? (
        <div className="absolute inset-0 z-20 flex flex-col bg-paper text-ink">
          <div
            className="flex items-center justify-between border-b border-line px-4"
            style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <h2 className="py-3 font-display text-2xl">Notes and messages</h2>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="grid h-11 w-11 place-items-center rounded-full"
              aria-label="Back to video"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            {sheet}
          </div>
        </div>
      ) : null}
    </div>
  );
}
