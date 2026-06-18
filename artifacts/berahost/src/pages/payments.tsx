import { useState } from "react";
import { motion } from "framer-motion";
import { 
  CreditCard, History, Clock, CheckCircle2, XCircle, Loader, Coins
} from "lucide-react";
import { useListPayments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { PaymentModal, PaymentMode } from "@/components/PaymentModal";
import { useQueryClient } from "@tanstack/react-query";

const COIN_PACKAGES = [
  { id: "starter",    name: "STARTER",    kes: 20,   coins: 20,   bonus: 0 },
  { id: "popular",    name: "POPULAR",    kes: 50,   coins: 60,   bonus: 10, popular: true },
  { id: "pro",        name: "PRO",        kes: 100,  coins: 130,  bonus: 30 },
  { id: "business",   name: "BUSINESS",   kes: 500,  coins: 700,  bonus: 200 },
  { id: "enterprise", name: "ENTERPRISE", kes: 1000, coins: 1500, bonus: 500 },
];

export default function PaymentsPage() {
  const { data: payments, isLoading, refetch } = useListPayments();
  const [payMode, setPayMode] = useState<PaymentMode | null>(null);
  const qc = useQueryClient();

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 mb-2" /><Skeleton className="h-5 w-96" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96 w-full" /><Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "success": case "completed": return <CheckCircle2 className="h-4 w-4 text-accent" />;
      case "failed": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-yellow-400 animate-pulse" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "success": case "completed": return "border-accent/30 text-accent bg-accent/5";
      case "failed": return "border-destructive/30 text-destructive bg-destructive/5";
      default: return "border-yellow-500/30 text-yellow-400 bg-yellow-500/5";
    }
  };

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
          BILLING & PAYMENTS
        </h1>
        <p className="text-muted-foreground font-mono mt-1 text-sm">
          Top up via M-Pesa STK Push. Instant coin credit on payment confirmation.
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Up Panel */}
        <motion.div variants={item}>
          <Card className="border-primary/20 bg-card/40 backdrop-blur-sm relative overflow-hidden h-full">
            <div className="absolute -left-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
            <CardHeader>
              <CardTitle className="font-mono text-sm text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> TOP UP BALANCE
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                Select a package — you'll enter your M-Pesa number next
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {COIN_PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setPayMode({
                    type: "coins",
                    packageId: pkg.id,
                    name: pkg.name,
                    kes: pkg.kes,
                    coins: pkg.coins,
                    bonus: pkg.bonus,
                  })}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-lg cursor-pointer group text-left ${
                    pkg.popular
                      ? "border-primary/50 bg-primary/5 shadow-[0_0_15px_rgba(0,212,255,0.1)] hover:shadow-[0_0_25px_rgba(0,212,255,0.2)]"
                      : "border-border/50 bg-background/50 hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center font-black text-sm ${
                      pkg.popular ? "bg-primary text-primary-foreground" : "bg-secondary/10 text-secondary"
                    }`}>
                      {pkg.kes}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm">{pkg.name}</h3>
                        {pkg.popular && <Badge className="bg-primary hover:bg-primary text-[10px] font-mono h-5">POPULAR</Badge>}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground mt-0.5">
                        Get {pkg.coins} Coins
                        {pkg.bonus > 0 && <span className="text-yellow-400 ml-1">(+{pkg.bonus} bonus)</span>}
                      </div>
                    </div>
                  </div>
                  <div className={`text-sm font-mono font-bold px-3 py-1.5 rounded-lg border transition-all ${
                    pkg.popular
                      ? "bg-primary/20 border-primary/40 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                      : "border-border/50 group-hover:border-primary/50 group-hover:bg-primary/10 group-hover:text-primary"
                  }`}>
                    KES {pkg.kes}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment History */}
        <motion.div variants={item}>
          <Card className="border-border/50 bg-card/30 backdrop-blur-sm h-full flex flex-col">
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <History className="h-4 w-4 text-secondary" /> PAYMENT HISTORY
              </CardTitle>
              <CardDescription className="font-mono text-xs">Recent M-Pesa transactions</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {payments && payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex flex-col p-4 rounded-lg bg-background/50 border border-border/30 gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            payment.status === "success" || payment.status === "completed" ? "bg-accent/10" :
                            payment.status === "failed" ? "bg-destructive/10" : "bg-yellow-500/10"
                          }`}>
                            {statusIcon(payment.status)}
                          </div>
                          <div>
                            <p className="text-sm font-medium font-mono uppercase">
                              {(payment.package || "Custom").replace("sub:", "Plan: ")} Package
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {format(new Date(payment.createdAt), "MMM d, yyyy HH:mm")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">KES {payment.amountKes}</div>
                          <Badge variant="outline" className={`text-[10px] font-mono h-4 uppercase ${statusColor(payment.status)}`}>
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground font-mono bg-black/20 p-2 rounded border border-white/5">
                        <span>Ref: {payment.payheroTxnId || "N/A"}</span>
                        {payment.coinsAwarded > 0 && (
                          <span className="text-yellow-400 flex items-center gap-1">
                            <Coins className="h-3 w-3" /> +{payment.coinsAwarded} coins
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-10 border border-dashed border-border/50 rounded-lg">
                  <CreditCard className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium mb-1">No Payment History</p>
                  <p className="text-xs text-muted-foreground font-mono">Select a package above to make your first purchase.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <PaymentModal
        open={!!payMode}
        onClose={() => { setPayMode(null); refetch(); qc.invalidateQueries({ queryKey: ["getCoinBalance"] }); }}
        mode={payMode}
      />
    </motion.div>
  );
}
