import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Smartphone, CreditCard, Coins, Loader2, CheckCircle2, XCircle,
  Clock, AlertCircle, Star, Zap, RefreshCw
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL;
const apiFetch = (path: string, opts?: RequestInit) =>
  fetch(`${BASE}api${path}`, { credentials: "include", ...opts });

export type PaymentMode =
  | { type: "coins"; packageId: string; name: string; kes: number; coins: number; bonus: number }
  | { type: "subscription"; planId: string; name: string; kes: number };

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  mode: PaymentMode | null;
}

type Step = "phone" | "pending" | "success" | "failed";

const MAX_WAIT_SECS = 300;

/** Animated pulsing rings around an icon */
function PulseRings({ color = "primary" }: { color?: string }) {
  return (
    <div className="relative flex items-center justify-center">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full border border-${color}/30`}
          initial={{ width: 80, height: 80, opacity: 0.6 }}
          animate={{ width: 80 + i * 28, height: 80 + i * 28, opacity: 0 }}
          transition={{ duration: 2, delay: i * 0.5, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/** Circular SVG countdown ring */
function CountdownRing({ elapsed, max }: { elapsed: number; max: number }) {
  const pct = Math.min(elapsed / max, 1);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - pct);
  const color = pct < 0.6 ? "#00d4ff" : pct < 0.85 ? "#facc15" : "#ef4444";
  const mins = Math.floor((max - elapsed) / 60);
  const secs = (max - elapsed) % 60;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={circ}
        strokeDashoffset={dash}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
      />
      <text x="50" y="54" textAnchor="middle" className="rotate-90 origin-center"
        style={{ fill: color, fontSize: 13, fontWeight: 900, fontFamily: "monospace", transform: "rotate(90deg)", transformOrigin: "50px 50px" }}>
        {mins}:{String(secs).padStart(2, "0")}
      </text>
    </svg>
  );
}

export function PaymentModal({ open, onClose, mode }: PaymentModalProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [txnId, setTxnId] = useState<number | null>(null);
  const [manualChecking, setManualChecking] = useState(false);

  const pollCountRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const [showManualCheck, setShowManualCheck] = useState(false);

  // Tick elapsed seconds while pending
  useEffect(() => {
    if (step !== "pending") return;
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [step]);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setPhone("");
      setStep("phone");
      setTxnId(null);
      pollCountRef.current = 0;
      setElapsed(0);
      setShowManualCheck(false);
      setManualChecking(false);
    }
  }, [open]);

  // Poll payment status every 3s while pending
  const { data: pollData, refetch: recheckNow } = useQuery({
    queryKey: ["payment-status", txnId],
    queryFn: () => apiFetch(`/payments/status/${txnId}`).then(r => r.json()),
    enabled: step === "pending" && !!txnId,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (step !== "pending" || !pollData) return;
    if (pollData.status === "success") {
      setStep("success");
      qc.invalidateQueries({ queryKey: ["getCoinBalance"] });
      qc.invalidateQueries({ queryKey: ["getMe"] });
      qc.invalidateQueries({ queryKey: ["listPayments"] });
    } else if (pollData.status === "failed") {
      setStep("failed");
    } else {
      pollCountRef.current += 1;
      if (pollCountRef.current >= 10 && !showManualCheck) setShowManualCheck(true);
      if (pollCountRef.current >= 100) setStep("failed");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollData, step]);

  // Hard timeout at MAX_WAIT_SECS
  useEffect(() => {
    if (step === "pending" && elapsed >= MAX_WAIT_SECS) setStep("failed");
  }, [elapsed, step]);

  async function handleManualCheck() {
    if (!txnId) return;
    setManualChecking(true);
    try {
      const result = await recheckNow();
      const data = result?.data;
      if (data?.status === "success") {
        setStep("success");
        qc.invalidateQueries({ queryKey: ["getCoinBalance"] });
        qc.invalidateQueries({ queryKey: ["getMe"] });
      } else {
        toast({ title: "Still confirming...", description: "Payment is still being verified. Please wait a moment longer." });
      }
    } finally {
      setManualChecking(false);
    }
  }

  const coinsMutation = useMutation({
    mutationFn: ({ phone, pkg }: { phone: string; pkg: string }) =>
      apiFetch("/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, package: pkg }),
      }).then(r => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      setTxnId(d.transactionId);
      setStep("pending");
    },
    onError: () => toast({ title: "Network error", variant: "destructive" }),
  });

  const subMutation = useMutation({
    mutationFn: ({ phone, plan }: { phone: string; plan: string }) =>
      apiFetch("/payments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, plan }),
      }).then(r => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      setTxnId(d.transactionId);
      setStep("pending");
    },
    onError: () => toast({ title: "Network error", variant: "destructive" }),
  });

  const isPending = coinsMutation.isPending || subMutation.isPending;

  const handlePay = () => {
    if (!phone.trim() || !mode) return;
    if (mode.type === "coins") {
      coinsMutation.mutate({ phone: phone.trim(), pkg: mode.packageId });
    } else {
      subMutation.mutate({ phone: phone.trim(), plan: mode.planId });
    }
  };

  const handleClose = () => {
    if (step === "pending") return;
    onClose();
  };

  const resetToPhone = () => {
    setStep("phone");
    setTxnId(null);
    pollCountRef.current = 0;
    setElapsed(0);
    setShowManualCheck(false);
  };

  if (!mode) return null;

  const totalCoins = mode.type === "coins" ? mode.coins + mode.bonus : 0;
  const amount = mode.kes;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-primary/30 bg-card/95 backdrop-blur-xl max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black text-xl text-primary flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {mode.type === "coins" ? "BUY COINS — M-PESA" : "SUBSCRIBE — M-PESA"}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            Secure payment via Safaricom M-Pesa STK Push
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">

          {/* ── STEP 1: Phone Entry ─────────────────────────────────────── */}
          {step === "phone" && (
            <motion.div key="phone" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-4 pt-2">
              <div className="bg-background/30 rounded-xl p-4 border border-primary/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-mono text-muted-foreground">Package</span>
                  <Badge variant="outline" className="font-mono text-primary border-primary/30 text-xs uppercase">
                    {mode.name}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-mono text-muted-foreground">Amount</span>
                  <span className="font-black text-xl text-foreground">KES {amount}</span>
                </div>
                {mode.type === "coins" && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-mono text-muted-foreground">You receive</span>
                    <span className="font-black text-accent flex items-center gap-1">
                      <Coins className="h-4 w-4" /> {totalCoins} Coins
                      {mode.bonus > 0 && (
                        <Badge className="ml-1 text-[9px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border">+{mode.bonus} BONUS</Badge>
                      )}
                    </span>
                  </div>
                )}
                {mode.type === "subscription" && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-mono text-muted-foreground">Billing</span>
                    <span className="text-sm font-mono text-muted-foreground">Monthly</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase flex items-center gap-1">
                  <Smartphone className="h-3 w-3" /> M-Pesa Phone Number
                </label>
                <Input
                  placeholder="07XXXXXXXX or 01XXXXXXXX or 254..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePay()}
                  className="font-mono bg-background/50 border-primary/30 text-base h-11"
                  autoFocus
                />
                <p className="text-[10px] font-mono text-muted-foreground">
                  Accepts: 0712345678 · 0112345678 · 254712345678
                </p>
              </div>

              <Button
                className="w-full font-mono font-black bg-primary hover:bg-primary/90 text-primary-foreground h-11 shadow-[0_0_20px_rgba(0,212,255,0.3)]"
                onClick={handlePay}
                disabled={isPending || phone.trim().length < 9}
              >
                {isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Initiating...</>
                ) : (
                  <><Zap className="mr-2 h-4 w-4 fill-current" /> PAY KES {amount} NOW</>
                )}
              </Button>

              <p className="text-[10px] font-mono text-muted-foreground text-center">
                An M-Pesa prompt will appear on your phone. Enter your PIN to complete.
              </p>
            </motion.div>
          )}

          {/* ── STEP 2: Pending / Waiting ───────────────────────────────── */}
          {step === "pending" && (
            <motion.div key="pending" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 pt-2 text-center">

              {/* Phone icon with pulse rings + countdown ring */}
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="relative flex items-center justify-center h-28 w-28">
                  <PulseRings color="primary" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CountdownRing elapsed={elapsed} max={MAX_WAIT_SECS} />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center z-10">
                      <Smartphone className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-black text-lg text-primary">Check Your Phone!</h3>
                  <p className="text-sm font-mono text-muted-foreground mt-0.5">M-Pesa STK prompt sent to</p>
                  <p className="text-base font-bold font-mono text-foreground mt-0.5 tracking-widest">{phone}</p>
                </div>
              </div>

              {/* Steps */}
              <div className="bg-background/30 rounded-lg p-3 border border-border/30 space-y-2 text-left">
                {[
                  { label: "M-Pesa prompt sent to your phone", done: true },
                  { label: "Enter your M-Pesa PIN when prompted", done: false },
                  { label: "Coins credited automatically on confirmation", done: false },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      s.done ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"
                    }`}>
                      {s.done ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                    </div>
                    <span className={s.done ? "text-accent/70" : "text-muted-foreground"}>{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Live status line */}
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground">
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="h-2 w-2 rounded-full bg-yellow-400"
                />
                Waiting for M-Pesa confirmation...
              </div>

              {/* Manual check — shows after ~30s */}
              {showManualCheck && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full font-mono text-xs border-accent/40 text-accent hover:bg-accent/10"
                    onClick={handleManualCheck}
                    disabled={manualChecking}
                  >
                    {manualChecking ? (
                      <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Checking...</>
                    ) : (
                      <><CheckCircle2 className="mr-2 h-3 w-3" /> I&apos;ve completed the M-Pesa payment</>
                    )}
                  </Button>
                </motion.div>
              )}

              <p className="text-[10px] font-mono text-muted-foreground">
                Didn&apos;t receive a prompt?{" "}
                <button className="text-primary underline" onClick={resetToPhone}>
                  Try again
                </button>
              </p>
            </motion.div>
          )}

          {/* ── STEP 3: Success ─────────────────────────────────────────── */}
          {step === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 pt-2 text-center">
              <div className="flex flex-col items-center gap-4 py-4">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  className="h-24 w-24 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center shadow-[0_0_40px_rgba(0,255,136,0.25)]"
                >
                  <CheckCircle2 className="h-12 w-12 text-accent" />
                </motion.div>
                <div>
                  <h3 className="font-black text-xl text-accent">Payment Confirmed!</h3>
                  {mode.type === "coins" ? (
                    <p className="text-sm font-mono text-muted-foreground mt-1">
                      <span className="text-accent font-bold">{totalCoins} Coins</span> have been added to your wallet.
                    </p>
                  ) : (
                    <p className="text-sm font-mono text-muted-foreground mt-1">
                      Your plan is now <span className="text-primary font-bold">{mode.name}</span>.
                    </p>
                  )}
                </div>
              </div>
              <Button className="w-full font-mono bg-accent hover:bg-accent/90 text-black font-bold h-11" onClick={onClose}>
                <Star className="mr-2 h-4 w-4 fill-current" /> AWESOME, CONTINUE
              </Button>
            </motion.div>
          )}

          {/* ── STEP 4: Failed / Timeout ─────────────────────────────────── */}
          {step === "failed" && (
            <motion.div key="failed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 pt-2 text-center">
              <div className="flex flex-col items-center gap-4 py-4">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  className="h-24 w-24 rounded-full bg-destructive/10 border-2 border-destructive flex items-center justify-center"
                >
                  <XCircle className="h-12 w-12 text-destructive" />
                </motion.div>
                <div>
                  <h3 className="font-black text-xl text-destructive">Confirmation Timed Out</h3>
                  <p className="text-sm font-mono text-muted-foreground mt-1">
                    We could not confirm your payment within 5 minutes.
                  </p>
                </div>
              </div>

              <div className="bg-yellow-500/5 border border-yellow-500/30 rounded-lg p-3 text-xs font-mono text-left space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-3 w-3 text-yellow-400 mt-0.5 shrink-0" />
                  <span className="text-yellow-300 font-semibold">If M-Pesa charged you, your coins will be credited automatically once the payment confirms. Check your balance before trying again.</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Not charged? Possible reasons: wrong PIN, insufficient M-Pesa balance, or prompt was not answered.</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 font-mono text-xs border-border/50" onClick={() => {
                  qc.invalidateQueries({ queryKey: ["getCoinBalance"] });
                  qc.invalidateQueries({ queryKey: ["getMe"] });
                  onClose();
                }}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Check Balance
                </Button>
                <Button className="flex-1 font-mono bg-primary hover:bg-primary/90" onClick={resetToPhone}>
                  <Zap className="h-3 w-3 mr-1" /> Try Again
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
