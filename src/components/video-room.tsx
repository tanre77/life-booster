import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MessageSquare, Mic, MicOff, Video, VideoOff, Volume2 } from "lucide-react";
import { listSignals, postSignal, touchPresence } from "@/lib/life/api";
import { Button } from "@/components/shell";

async function openCamera(): Promise<MediaStream> {
  const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  const attempts: MediaStreamConstraints[] = [
    { video: { facingMode: "user" }, audio },
    { video: true, audio: true },
    { audio: true },
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

function attach(video: HTMLVideoElement | HTMLAudioElement | null, stream: MediaStream | null) {
  if (!video) return;
  video.srcObject = stream;
  if (video instanceof HTMLVideoElement) {
    video.muted = video.hasAttribute("data-local");
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
  }
  if (video instanceof HTMLAudioElement) {
    video.muted = false;
    video.volume = 1;
  }
  if (stream) void video.play().catch(() => undefined);
}

export function VideoStage({
  appointmentId,
  role,
  title,
  durationMin,
  sheet,
  externalJoin,
}: {
  appointmentId: number;
  role: "member" | "counselor" | "solo";
  title: string;
  durationMin: number;
  sheet: ReactNode;
  externalJoin?: ReactNode;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [hearBlocked, setHearBlocked] = useState(false);
  const [started, setStarted] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [camNote, setCamNote] = useState<string | null>(null);
  const [phase, setPhase] = useState("Camera is off until you start.");
  const [remoteLive, setRemoteLive] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [recordWanted, setRecordWanted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [ended, setEnded] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  const visitMs = Math.max(1, durationMin) * 60 * 1000;
  const remaining = startedAt ? Math.max(0, visitMs - (now - startedAt)) : visitMs;
  const clockMinutes = Math.floor(remaining / 60000);
  const clockSeconds = Math.floor((remaining % 60000) / 1000);
  const clock =
    !startedAt ? `${clockMinutes}:${String(clockSeconds).padStart(2, "0")}` : remaining === 0 ? "Time is up" : `${clockMinutes}:${String(clockSeconds).padStart(2, "0")}`;

  function stopRecording() {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") return;
    rec.stop();
    setRecording(false);
  }

  function beginRecording() {
    const local = streamRef.current;
    if (!local || typeof MediaRecorder === "undefined") {
      setCamNote("This browser cannot record the visit.");
      setRecordWanted(false);
      return;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") return;
    const mixed = new MediaStream();
    for (const track of local.getTracks()) mixed.addTrack(track);
    for (const track of remoteStreamRef.current?.getTracks() ?? []) mixed.addTrack(track);
    const mime = ["video/mp4", "video/webm;codecs=vp8,opus", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
    let rec: MediaRecorder;
    try {
      rec = mime ? new MediaRecorder(mixed, { mimeType: mime }) : new MediaRecorder(mixed);
    } catch {
      setCamNote("This browser cannot record the visit.");
      setRecordWanted(false);
      return;
    }
    chunksRef.current = [];
    rec.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
      if (blob.size) setRecordingUrl(URL.createObjectURL(blob));
    };
    rec.start(1000);
    recorderRef.current = rec;
    setRecording(true);
  }

  useEffect(() => {
    if (remoteLive && startedAt === null) setStartedAt(Date.now());
  }, [remoteLive, startedAt]);

  useEffect(() => {
    if (!remoteLive) return;
    hearThem();
  }, [remoteLive]);

  useEffect(() => {
    if (!recordWanted || !remoteLive || !started || recording || recordingUrl || ended) return;
    beginRecording();
  }, [recordWanted, remoteLive, started, recording, recordingUrl, ended]);

  useEffect(() => {
    if (!startedAt || remaining > 0 || ended) return;
    stopRecording();
    setEnded(true);
  }, [startedAt, remaining, ended]);

  function leave() {
    stopRecording();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void navigate({ to: "/visits" });
  }

  function wrapUp() {
    stopRecording();
    setEnded(true);
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

    let mediaReady = false;

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
        const audioTracks = stream.getAudioTracks();
        if (!audioTracks.length) {
          setCamNote("Microphone is off. Allow the mic in iPhone settings, then start again.");
        }
        stream.getTracks().forEach((track) => {
          track.enabled = true;
          pc?.addTrack(track, stream);
        });
        setPhase(role === "counselor" ? "Camera on. Waiting for the member to join." : "Camera on. Your counselor will be joining soon.");
      } catch {
        if (!stopped) {
          setCamNote("Camera and microphone stayed off. Allow them in the phone settings, then start again. Messages still work.");
          setPhase(role === "counselor" ? "Waiting for the member, without a camera." : "Waiting without a camera. Your counselor will be joining soon.");
        }
      }
      mediaReady = true;
    }

    if (pc) {
      pc.ontrack = (event) => {
        const stream = event.streams[0] ?? new MediaStream([event.track]);
        remoteStreamRef.current = stream;
        attach(remoteRef.current, stream);
        const audio = remoteAudioRef.current;
        if (audio) {
          audio.srcObject = stream;
          audio.muted = false;
          audio.volume = 1;
          void audio.play().then(() => setHearBlocked(false)).catch(() => setHearBlocked(true));
        }
        setRemoteLive(true);
        setPhase(role === "counselor" ? "The member is here. The visit timer is running." : "Your counselor is here. The visit timer is running.");
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
        const canOffer =
          mediaReady && presence.peer && !offered && !answered && pc.signalingState === "stable" && (role === "member" || role === "counselor");
        if (canOffer) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await postSignal({
            data: { id: appointmentId, kind: "offer", payload: JSON.stringify(pc.localDescription) },
          });
          offered = true;
          setPhase(role === "counselor" ? "Connecting to the member…" : "Reaching their camera…");
        } else if (!presence.peer && !offered && !answered) {
          setPhase(role === "counselor" ? "You are in the room. The member has not opened the visit yet." : "Waiting for your counselor to open this visit.");
        }
        const signals = await listSignals({ data: { id: appointmentId, afterId } });
        for (const signal of signals) {
          afterId = Math.max(afterId, signal.id);
          if (signal.kind === "offer" && !answered) {
            if (offered && pc.signalingState === "have-local-offer") {
              if (role === "member") continue;
              try {
                await pc.setLocalDescription({ type: "rollback" });
              } catch {
                continue;
              }
            }
            if (pc.signalingState !== "stable" && pc.signalingState !== "have-local-offer") continue;
            await pc.setRemoteDescription(JSON.parse(signal.payload) as RTCSessionDescriptionInit);
            await flushIce();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await postSignal({
              data: { id: appointmentId, kind: "answer", payload: JSON.stringify(pc.localDescription) },
            });
            answered = true;
            offered = true;
          } else if (signal.kind === "answer" && !pc.currentRemoteDescription) {
            await pc.setRemoteDescription(JSON.parse(signal.payload) as RTCSessionDescriptionInit);
            await flushIce();
            answered = true;
          } else if (signal.kind === "ice") {
            const candidate = JSON.parse(signal.payload) as RTCIceCandidateInit;
            if (!pc.remoteDescription) pendingIce.push(candidate);
            else await pc.addIceCandidate(candidate);
          }
        }
      } catch {
        /* signaling can retry on the next tick */
      }
      if (!stopped) timerId = window.setTimeout(() => void tick(), document.hidden ? 8000 : 2500);
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

  function hearThem() {
    const audio = remoteAudioRef.current;
    if (!audio) return;
    audio.muted = false;
    audio.volume = 1;
    void audio.play().then(() => setHearBlocked(false)).catch(() => setHearBlocked(true));
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
        muted
        className={remoteLive ? "absolute inset-0 h-full w-full object-cover" : "absolute h-px w-px opacity-0"}
      />
      <audio ref={remoteAudioRef} autoPlay playsInline />
      <video
        ref={localRef}
        autoPlay
        playsInline
        muted
        data-local="true"
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
            onClick={wrapUp}
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
        <div className="text-right">
          <p className="shrink-0 font-display text-3xl tabular-nums">{clock}</p>
          <p className="text-xs text-surface/75">{startedAt ? (recording ? "Recording" : "Visit time") : role === "counselor" ? "Starts when the member joins" : "Starts when they join"}</p>
        </div>
      </div>
      {!started ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-spruce-deep/85 p-6 text-center">
          <div className="max-w-xs space-y-3">
            <p className="text-sm text-surface/90">
              {role === "counselor"
                ? "You are the counselor. Join to connect your camera. The timer starts when the member is on the call."
                : "This will be a live person. Your counselor will be joining soon. The timer starts when they join. Your camera starts when you tap."}
            </p>
            <label className="flex items-start justify-center gap-3 text-left text-sm text-surface/90">
              <input
                type="checkbox"
                checked={recordWanted}
                onChange={(event) => setRecordWanted(event.target.checked)}
                className="mt-1 h-5 w-5 accent-spruce"
              />
              <span>Record this visit. You can save the recording when it ends.</span>
            </label>
            <Button
              type="button"
              variant="dark"
              className="bg-surface text-ink hover:bg-paper"
              onClick={() => {
                setStarted(true);
                hearThem();
              }}
            >
              {role === "counselor" ? "Join video" : "Start video"}
            </Button>
            {externalJoin ? <div className="text-sm text-surface">{externalJoin}</div> : null}
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
          {hearBlocked ? (
            <button
              type="button"
              onClick={hearThem}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium text-ink"
            >
              <Volume2 className="h-5 w-5" />
              Tap to hear
            </button>
          ) : null}
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
        <div className="absolute inset-0 z-40 flex flex-col bg-paper text-ink">
          <div
            className="flex items-center gap-2 border-b border-line px-3"
            style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-medium"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to video
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            <h2 className="font-display text-3xl">Notes and messages</h2>
            <label className="mb-4 block text-sm">
              <span className="font-medium">Your notes</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Kept for you at the end of the visit"
                className="mt-2 min-h-28 w-full rounded-2xl border border-line bg-paper px-3 py-2"
              />
            </label>
            {sheet}
          </div>
        </div>
      ) : null}
      {ended ? (
        <div className="absolute inset-0 z-50 overflow-y-auto bg-paper px-4 py-6 text-ink" style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}>
          <button type="button" onClick={leave} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium">
            <ArrowLeft className="h-5 w-5" />
            Back to visits
          </button>
          <h2 className="mt-3 font-display text-4xl">Visit notes</h2>
          <p className="mt-2 text-sm text-muted">Saved from this visit. Nothing here is sent unless you share it.</p>
          <section className="mt-5">
            <h3 className="font-display text-2xl">Your notes</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm">{notes.trim() || "No notes were kept."}</p>
          </section>
          {recordingUrl ? (
            <a href={recordingUrl} download={`visit-${appointmentId}.webm`} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-spruce-deep px-4 text-sm text-surface">
              Save recording
            </a>
          ) : recordWanted ? (
            <p className="mt-5 text-sm text-muted">The recording will appear here when the file is ready.</p>
          ) : null}
          <div className="mt-6">{sheet}</div>
        </div>
      ) : null}
    </div>
  );
}
