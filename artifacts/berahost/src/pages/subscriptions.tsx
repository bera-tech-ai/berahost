import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ShieldCheck, CheckCircle2, Server, Zap, X, CreditCard, Star
} from "lucide-react";
import { useListSubscriptionPlans, useGetSubscriptionStatus, useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PaymentModal, PaymentMode } from "@/components/PaymentModal";
import { useQueryClient } from "@tanstack/react-query";

const PLAN_DETAILS = [
  {
    id: "free", name: "Free", kes: 0, coinsPerMonth: 10, maxBots: 1,
    features: ["1 Bot Instance", "10 Coins (one-time)", "Community Support", "Standard Network"],
    excluded: ["Priority Support", "Bot Cloning", "Webhooks & Metrics"]
  },
  {
    id: "starter", name: "Starter", kes: 199, coinsPerMonth: 0, maxBots: 3,
    features: ["3 Bot Instances", "Priority Support", "Log Export", "Webhook Notifications"],
    excluded: []
  },
  {
    id: "pro", name: "Pro", kes: 499, coinsPerMonth: 0, maxBots: 10,
    features: ["10 Bot Instances", "Bot Cloning", "Live Metrics", "Webhooks", "API Access"],
    excluded: []
  },
  {
    id: "business", name: "Business", kes: 999, coinsPerMonth: 0, maxBots: 25,
    features: ["25 Bot Instances", "All Pro features", "Custom Domains", "Priority Tier", "Dedicated Support"],
    excluded: []
  },
  {
    id: "enterprise", name: "Enterprise", kes: 2999, coinsPerMonth: 0, maxBots: 9999,
    features: ["Unlimited Bots", "Dedicated Infrastructure", "SLA Guarantee", "White-label option", "Everything"],
    excluded: []
  },
];

export default function SubscriptionsPage() {
  const { data: user, isLoading: userLoading } = useGetMe();
  const { data: status, isLoading: statusLoading } = useGetSubscriptionStatus();
  const qc = useQueryClient();

  const [payMode, setPayMode] = useState<PaymentMode | null>(null);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  if (statusLoading || userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 mb-2" /><Skeleton className="h-5 w-96" />
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5 mt-8">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-[480px] w-full" />)}
        </div>
      </div>
    );
  }

  const currentPlan = user?.subscriptionPlan || "free";

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="text-center max-w-2xl mx-auto mb-4">
        <Badge variant="outline" className="mb-4 bg-primary/10 text-primary border-primary/30 font-mono">
          <ShieldCheck className="mr-2 h-3 w-3" /> UPGRADE YOUR ARSENAL
        </Badge>
        <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-4">
          SUBSCRIPTION TIERS
        </h1>
        <p className="text-muted-foreground font-mono text-sm">
          Scale your bot empire. All paid plans via M-Pesa STK Push — instant activation.
        </p>
      </motion.div>

      {/* Current plan banner */}
      {currentPlan !== "free" && (
        <motion.div variants={item}>
          <Card className="border-accent/30 bg-accent/5 backdrop-blur-sm">
            <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-accent">Active: {currentPlan.toUpperCase()} Plan</h3>
                  <p className="text-xs font-mono text-muted-foreground">
                    {status?.expiresAt ? `Renews: ${new Date(status.expiresAt).toLocaleDateString()}` : "Active subscription"}
                  </p>
                </div>
              </div>
              <Badge className="bg-accent/20 text-accent border-none font-mono">
                <Star className="mr-1.5 h-3 w-3 fill-current" /> Premium Member
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={item} className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {PLAN_DETAILS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isPopular = plan.id === "pro";
          const isFree = plan.id === "free";

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col h-full overflow-hidden transition-all duration-300 ${
                isCurrent
                  ? "border-accent bg-card/60 shadow-[0_0_25px_rgba(0,255,136,0.1)]"
                  : isPopular
                    ? "border-primary/60 bg-primary/5 shadow-[0_0_25px_rgba(0,212,255,0.15)]"
                    : "border-border/50 bg-card/40 hover:border-primary/30"
              }`}
            >
              {isPopular && !isCurrent && (
                <div className="absolute top-0 inset-x-0 bg-primary text-primary-foreground text-[10px] font-black py-1 text-center font-mono tracking-widest">
                  RECOMMENDED
                </div>
              )}
              {isCurrent && (
                <div className="absolute top-0 inset-x-0 bg-accent text-black text-[10px] font-black py-1 text-center font-mono tracking-widest">
                  CURRENT PLAN
                </div>
              )}

              <CardHeader className={`text-center pb-3 ${isPopular || isCurrent ? "pt-8" : ""}`}>
                <CardTitle className="text-base font-black uppercase tracking-wider">{plan.name}</CardTitle>
                <div className="mt-3 flex justify-center items-baseline gap-1">
                  {isFree ? (
                    <span className="text-3xl font-black text-accent">FREE</span>
                  ) : (
                    <>
                      <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60">
                        {plan.kes}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">KES/mo</span>
                    </>
                  )}
                </div>
                <CardDescription className="font-mono text-[10px] mt-1 text-primary/70">
                  {plan.maxBots === 9999 ? "Unlimited" : plan.maxBots} bot{plan.maxBots !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 pt-2">
                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                        isCurrent ? "text-accent" : isPopular ? "text-primary" : "text-secondary"
                      }`} />
                      <span className="text-muted-foreground font-mono">{feature}</span>
                    </li>
                  ))}
                  {plan.excluded.map((feat, i) => (
                    <li key={`ex-${i}`} className="flex items-start gap-2 text-xs opacity-40">
                      <X className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                      <span className="text-muted-foreground font-mono line-through">{feat}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-3 border-t border-border/50 bg-background/20">
                {isFree ? (
                  <Button className="w-full font-mono text-xs" variant="outline" disabled>
                    {isCurrent ? "CURRENT PLAN" : "FREE TIER"}
                  </Button>
                ) : (
                  <Button
                    className={`w-full font-mono font-bold text-xs ${
                      isCurrent
                        ? "bg-accent/20 text-accent hover:bg-accent/30 cursor-default"
                        : isPopular
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                          : "bg-secondary/10 text-secondary hover:bg-secondary/20 border border-secondary/30"
                    }`}
                    disabled={isCurrent}
                    onClick={() => !isCurrent && setPayMode({
                      type: "subscription",
                      planId: plan.id,
                      name: plan.name,
                      kes: plan.kes,
                    })}
                  >
                    {isCurrent ? (
                      <><ShieldCheck className="mr-1.5 h-3 w-3" /> ACTIVE</>
                    ) : (
                      <><CreditCard className="mr-1.5 h-3 w-3" /> SUBSCRIBE — KES {plan.kes}</>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </motion.div>

      <motion.div variants={item}>
        <div className="bg-background/20 rounded-xl border border-border/30 p-4 flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xs font-mono text-muted-foreground">
            <strong className="text-foreground">How subscriptions work:</strong> Click Subscribe, enter your M-Pesa number, enter your PIN on the prompt. 
            Your plan upgrades instantly. All payments via Safaricom M-Pesa — no card required.
          </div>
        </div>
      </motion.div>

      <PaymentModal
        open={!!payMode}
        onClose={() => { setPayMode(null); qc.invalidateQueries({ queryKey: ["getMe"] }); }}
        mode={payMode}
      />
    </motion.div>
  );
}
