import { Button } from "@/components/ui/button";
import { Bell, Pause, Play, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAddSession } from "../hooks/useQueries";

const DURATIONS = [5, 10, 15, 20, 30];
const INTERVAL_OPTIONS = [
  { label: "Keine", value: 0 },
  { label: "3 min", value: 3 },
  { label: "5 min", value: 5 },
];

// Shared AudioContext that is created/resumed on user gesture
let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    sharedAudioContext = new AudioContext();
  }
  return sharedAudioContext;
}

// Creates a simple reverb impulse response buffer
function createReverbBuffer(
  ctx: AudioContext,
  duration: number,
  decay: number,
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
    }
  }
  return buffer;
}

// decay: seconds until the sound fades out completely
async function playBellSound(decay = 4) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    const now = ctx.currentTime;

    // Compressor to glue layers together
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 6;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    // Reverb (convolver)
    const convolver = ctx.createConvolver();
    convolver.buffer = createReverbBuffer(ctx, Math.min(decay * 0.6, 5), 2.5);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.28;

    // Master gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.55, now + 0.06);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);
    masterGain.connect(convolver);
    convolver.connect(reverbGain);
    reverbGain.connect(ctx.destination);

    // Layer definition: [startHz, endHz, relativeGain]
    const layers: [number, number, number][] = [
      [210, 168, 0.45], // Sub-fundamental (deep darkness)
      [420, 336, 0.38], // Fundamental
      [648, 518, 0.2], // 2nd partial (slight inharmonic stretch)
      [924, 738, 0.1], // 3rd partial (shimmer)
    ];

    for (const [startHz, endHz, relGain] of layers) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(startHz, now);
      osc.frequency.exponentialRampToValueAtTime(endHz, now + decay);

      gain.gain.value = relGain;

      osc.connect(gain);
      gain.connect(compressor);

      osc.start(now);
      osc.stop(now + decay + 0.05);
    }
  } catch {
    // Audio not supported
  }
}

// Warm up AudioContext on user gesture so it is ready when the timer ends
function warmUpAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  } catch {
    // ignore
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const SIZE = 280;
const STROKE = 8;
const RADIUS = (SIZE - STROKE * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function TimerScreen() {
  const [selectedMinutes, setSelectedMinutes] = useState(10);
  const [intervalMinutes, setIntervalMinutes] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(10 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastIntervalBellRef = useRef<number>(0);
  const addSession = useAddSession();

  const totalSeconds = selectedMinutes * 60;
  const progress = secondsLeft / totalSeconds;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsFinished(false);
    setSecondsLeft(selectedMinutes * 60);
    lastIntervalBellRef.current = 0;
  }, [selectedMinutes]);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setIsRunning(false);
          setIsFinished(true);
          playBellSound(4);
          addSession.mutate(BigInt(selectedMinutes));
          toast.success("Meditation abgeschlossen! 🙏", {
            description: `${selectedMinutes} Minuten gemeditiert.`,
          });
          return 0;
        }

        const newSecondsLeft = prev - 1;
        const elapsed = totalSeconds - newSecondsLeft;

        // Interval bell logic: ring every N minutes of elapsed time
        if (intervalMinutes > 0 && selectedMinutes > intervalMinutes) {
          const intervalSeconds = intervalMinutes * 60;
          const currentIntervalCount = Math.floor(elapsed / intervalSeconds);
          if (currentIntervalCount > lastIntervalBellRef.current) {
            lastIntervalBellRef.current = currentIntervalCount;
            playBellSound(4);
          }
        }

        return newSecondsLeft;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [isRunning, selectedMinutes, totalSeconds, intervalMinutes, addSession]);

  const handleStartPause = () => {
    warmUpAudio();
    if (isFinished) {
      reset();
      return;
    }
    // Play start bell (10 sec decay) only when starting fresh from the beginning
    if (!isRunning && secondsLeft === totalSeconds) {
      playBellSound(10);
    }
    setIsRunning((r) => !r);
  };

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Duration selector */}
      <div className="flex gap-2 flex-wrap justify-center">
        {DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            data-ocid="duration.button"
            onClick={() => setSelectedMinutes(d)}
            className={[
              "px-4 py-1.5 rounded-full text-sm font-body font-medium transition-all duration-300",
              selectedMinutes === d
                ? "bg-primary/90 text-primary-foreground shadow-glow"
                : "bg-card text-foreground/80 hover:text-foreground border border-border/50 hover:border-primary/40",
            ].join(" ")}
          >
            {d} min
          </button>
        ))}
      </div>

      {/* Interval bell selector */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs text-muted-foreground font-body uppercase tracking-widest flex items-center gap-1.5">
          <Bell className="w-3 h-3" />
          Zwischenglocke
        </span>
        <div className="flex gap-2">
          {INTERVAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-ocid="interval.button"
              onClick={() => setIntervalMinutes(opt.value)}
              className={[
                "px-4 py-1.5 rounded-full text-sm font-body font-medium transition-all duration-300",
                intervalMinutes === opt.value
                  ? "bg-primary/90 text-primary-foreground shadow-glow"
                  : "bg-card text-foreground/80 hover:text-foreground border border-border/50 hover:border-primary/40",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timer ring */}
      <div className="relative flex items-center justify-center">
        <div
          className={[
            "absolute rounded-full border border-primary/20 ring-breathe-outer",
            !isRunning && "ring-paused",
          ].join(" ")}
          style={{ width: SIZE + 48, height: SIZE + 48 }}
        />
        <div
          className={[
            "absolute rounded-full border border-primary/30 ring-breathe",
            !isRunning && "ring-paused",
          ].join(" ")}
          style={{ width: SIZE + 24, height: SIZE + 24 }}
        />

        <svg
          width={SIZE}
          height={SIZE}
          role="img"
          aria-label="Meditations-Timer"
          className={["ring-glow", !isRunning && "ring-paused"].join(" ")}
        >
          <title>Meditations-Timer</title>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="oklch(0.22 0.05 75)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="oklch(0.72 0.16 75)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS - 20}
            fill="none"
            stroke="oklch(0.65 0.10 75 / 0.15)"
            strokeWidth={1}
          />
        </svg>

        <div className="absolute flex flex-col items-center">
          <AnimatePresence mode="wait">
            {isFinished ? (
              <motion.div
                key="done"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center gap-1"
              >
                <Bell className="w-10 h-10 text-primary" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground font-body">
                  Fertig
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="time"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <span
                  className="font-timer text-5xl font-light tracking-tight text-foreground"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  {formatTime(secondsLeft)}
                </span>
                <span className="text-xs text-muted-foreground font-body mt-1 uppercase tracking-widest">
                  {isRunning
                    ? "läuft"
                    : secondsLeft === totalSeconds
                      ? "bereit"
                      : "pausiert"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mt-2">
        <Button
          data-ocid="timer.secondary_button"
          variant="ghost"
          size="icon"
          onClick={reset}
          className="rounded-full w-11 h-11 border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        <Button
          data-ocid="timer.primary_button"
          onClick={handleStartPause}
          className="rounded-full w-20 h-20 bg-primary/90 hover:bg-primary text-primary-foreground shadow-glow transition-all duration-300 hover:scale-105"
        >
          <AnimatePresence mode="wait">
            {isFinished ? (
              <motion.div
                key="replay"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <RotateCcw className="w-6 h-6" />
              </motion.div>
            ) : isRunning ? (
              <motion.div
                key="pause"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Pause className="w-6 h-6" fill="currentColor" />
              </motion.div>
            ) : (
              <motion.div
                key="play"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Play
                  className="w-6 h-6"
                  fill="currentColor"
                  style={{ marginLeft: "2px" }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>

        <div className="w-11 h-11" />
      </div>

      <AnimatePresence>
        {isRunning && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="text-xs text-muted-foreground font-body tracking-widest uppercase"
          >
            Atme ruhig und tief
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
