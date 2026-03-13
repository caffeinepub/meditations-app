import { Button } from "@/components/ui/button";
import { Bell, Pause, Play, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAddSession } from "../hooks/useQueries";

const DURATIONS = [5, 10, 15, 20, 30];

function playBellSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(528, now);
    osc1.frequency.exponentialRampToValueAtTime(420, now + 3);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(792, now);
    osc2.frequency.exponentialRampToValueAtTime(630, now + 3);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 4);
    osc2.stop(now + 4);

    setTimeout(() => ctx.close(), 5000);
  } catch {
    // Audio not supported
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
  const [secondsLeft, setSecondsLeft] = useState(10 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const addSession = useAddSession();

  const totalSeconds = selectedMinutes * 60;
  const progress = secondsLeft / totalSeconds;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsFinished(false);
    setSecondsLeft(selectedMinutes * 60);
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
          playBellSound();
          addSession.mutate(BigInt(selectedMinutes));
          toast.success("Meditation abgeschlossen! 🙏", {
            description: `${selectedMinutes} Minuten gemeditiert.`,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [isRunning, selectedMinutes, addSession]);

  const handleStartPause = () => {
    if (isFinished) {
      reset();
      return;
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
