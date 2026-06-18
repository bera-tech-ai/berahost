import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [introSeen, setIntroSeen] = useState(
    sessionStorage.getItem("introSeen") === "true"
  );
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe({
    query: {
      retry: false,
    },
  });

  useEffect(() => {
    if (!introSeen) {
      const timer = setTimeout(() => {
        sessionStorage.setItem("introSeen", "true");
        setIntroSeen(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [introSeen]);

  useEffect(() => {
    if (introSeen && !isLoading) {
      if (user) {
        setLocation("/dashboard");
      }
    }
  }, [introSeen, isLoading, user, setLocation]);

  if (!introSeen) {
    const letters = "BERAHOST".split("");
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center overflow-hidden z-50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background to-background pointer-events-none" />
        <div className="relative z-10 flex text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-primary to-secondary drop-shadow-[0_0_15px_rgba(0,212,255,0.5)]">
          {letters.map((letter, i) => (
            <motion.span
              key={i}
              initial={{ rotateX: 90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={{
                type: "spring",
                damping: 12,
                stiffness: 100,
                delay: i * 0.1,
              }}
              style={{ display: "inline-block", transformOrigin: "bottom" }}
            >
              {letter}
            </motion.span>
          ))}
        </div>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-6 text-xl md:text-2xl text-primary/80 font-mono tracking-widest drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]"
        >
          Deploy. Scale. Dominate.
        </motion.p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      <div className="z-10 text-center max-w-2xl px-4">
        <h1 className="text-5xl md:text-7xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary drop-shadow-sm">
          BERAHOST
        </h1>
        <p className="text-xl text-muted-foreground mb-10 font-mono">
          The ultimate WhatsApp bot deployment platform. Fast, secure, and built for dominance.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto font-mono text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,212,255,0.5)] hover:shadow-[0_0_25px_rgba(0,212,255,0.7)] transition-all">
              SYSTEM LOGIN
            </Button>
          </Link>
          <Link href="/register" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto font-mono text-lg border-primary/50 text-primary hover:bg-primary/10 backdrop-blur-sm">
              NEW DEPLOYER
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
