import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Flame } from "lucide-react";
import { motion } from "motion/react";
import type { Session } from "../backend.d.ts";
import { useGetSessions } from "../hooks/useQueries";

function formatDate(timestamp: bigint): string {
  const ms = Number(timestamp / 1_000_000n);
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

function computeStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0;
  const days = new Set(
    sessions.map((s) => {
      const ms = Number(s.date / 1_000_000n);
      const d = new Date(ms);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }),
  );
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < days.size + 1; i++) {
    const check = new Date(today);
    check.setDate(today.getDate() - i);
    const key = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`;
    if (days.has(key)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export default function HistoryScreen() {
  const { data: sessions = [], isLoading } = useGetSessions();

  const sorted = [...sessions].sort((a, b) => (b.date > a.date ? 1 : -1));
  const totalMinutes = sessions.reduce((acc, s) => acc + Number(s.duration), 0);
  const streak = computeStreak(sessions);

  return (
    <div className="flex flex-col gap-6 py-6">
      <div data-ocid="stats.panel" className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl p-4 flex flex-col gap-2 bg-card border border-border/60 border-l-2 border-l-primary/70"
          style={{
            backdropFilter: "blur(8px)",
            boxShadow:
              "0 2px 16px oklch(0.08 0.04 148 / 0.6), inset 0 1px 0 oklch(0.35 0.08 148 / 0.3)",
          }}
        >
          <Clock className="w-5 h-5 text-primary" strokeWidth={1.5} />
          <p className="font-timer text-3xl font-light text-foreground">
            {totalMinutes}
          </p>
          <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">
            Minuten gesamt
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-4 flex flex-col gap-2 bg-card border border-border/60 border-l-2 border-l-primary/70"
          style={{
            backdropFilter: "blur(8px)",
            boxShadow:
              "0 2px 16px oklch(0.08 0.04 148 / 0.6), inset 0 1px 0 oklch(0.35 0.08 148 / 0.3)",
          }}
        >
          <Flame className="w-5 h-5 text-secondary" strokeWidth={1.5} />
          <p className="font-timer text-3xl font-light text-foreground">
            {streak}
          </p>
          <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">
            Tage in Folge
          </p>
        </motion.div>
      </div>

      <div>
        <h3 className="text-xs text-muted-foreground uppercase tracking-widest mb-3 font-body">
          Sitzungen
        </h3>

        {isLoading ? (
          <div
            data-ocid="history.loading_state"
            className="flex flex-col gap-2"
          >
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <motion.div
            data-ocid="history.empty_state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-12 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center">
              <Calendar
                className="w-6 h-6 text-muted-foreground"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-muted-foreground font-body text-sm">
              Noch keine Meditationen aufgezeichnet.
            </p>
            <p className="text-muted-foreground/60 font-body text-xs">
              Starte deine erste Sitzung!
            </p>
          </motion.div>
        ) : (
          <ul data-ocid="history.list" className="flex flex-col gap-2">
            {sorted.map((session, i) => (
              <motion.li
                key={String(session.date)}
                data-ocid={`history.item.${i + 1}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between rounded-xl px-4 py-3 bg-card border border-border/50 border-l-2 border-l-primary/60"
                style={{
                  backdropFilter: "blur(6px)",
                }}
              >
                <span className="text-sm font-body text-foreground">
                  {formatDate(session.date)}
                </span>
                <span className="font-timer text-lg font-light text-primary">
                  {Number(session.duration)} min
                </span>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
