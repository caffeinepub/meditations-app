import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import HistoryScreen from "./components/HistoryScreen";
import TimerScreen from "./components/TimerScreen";

const queryClient = new QueryClient();

type Tab = "timer" | "history";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("timer");

  return (
    <div className="meditation-bg min-h-screen flex flex-col">
      <header className="pt-10 pb-4 text-center">
        <motion.h1
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="font-timer text-2xl font-light tracking-[0.15em] text-foreground/90 uppercase"
        >
          Stille
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-muted-foreground font-body tracking-widest mt-1 uppercase"
        >
          Meditationsbegleiter
        </motion.p>
      </header>

      <main className="flex-1 px-4 max-w-sm mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === "timer" ? (
            <motion.div
              key="timer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <TimerScreen />
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <HistoryScreen />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="pb-8 pt-4 flex justify-center">
        <div className="flex bg-muted/50 backdrop-blur-sm rounded-full p-1 border border-border gap-1">
          <button
            type="button"
            data-ocid="timer.tab"
            onClick={() => setActiveTab("timer")}
            className={[
              "px-6 py-2 rounded-full text-sm font-body font-medium transition-all duration-300",
              activeTab === "timer"
                ? "bg-primary/90 text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            Meditieren
          </button>
          <button
            type="button"
            data-ocid="history.tab"
            onClick={() => setActiveTab("history")}
            className={[
              "px-6 py-2 rounded-full text-sm font-body font-medium transition-all duration-300",
              activeTab === "history"
                ? "bg-primary/90 text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            Verlauf
          </button>
        </div>
      </nav>

      <footer className="pb-4 text-center">
        <p className="text-xs text-muted-foreground/40 font-body">
          © {new Date().getFullYear()}. Erstellt mit ♥ auf{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </footer>

      <Toaster />
    </div>
  );
}

export default function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
