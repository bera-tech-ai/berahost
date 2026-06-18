import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Coins, CreditCard, History, Gift, Zap,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle2
} from "lucide-react";
import { 
  useGetCoinBalance, useListCoinTransactions, useRedeemVoucher, useClaimDailyBonus 
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentModal, PaymentMode } from "@/components/PaymentModal";

const COIN_PACKAGES = [
  { id: "starter",    name: "STARTER",    kes: 10,  coins: 15,   bonus: 0,   label: "Entry" },
  { id: "popular",    name: "POPULAR",    kes: 30,  coins: 45,   bonus: 5,   popular: true, label: "Best Value" },
  { id: "pro",        name: "PRO",        kes: 50,  coins: 80,   bonus: 20,  label: "Recommended" },
  { id: "business",   name: "BUSINESS",   kes: 150, coins: 250,  bonus: 100, label: "Power User" },
  { id: "enterprise", name: "ENTERPRISE", kes: 500, coins: 900,  bonus: 400, label: "Elite" },
];

export default function CoinsPage() {
  const { toast } = useToast();
  const [voucherCode, setVoucherCode] = useState("");
  const [payMode, setPayMode] = useState<PaymentMode | null>(null);

  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useGetCoinBalance();
  const { data: transactions, isLoading: txLoading, refetch: refetchTx } = useListCoinTransactions();

  const claimMutation = useClaimDailyBonus({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Daily Bonus Claimed!", description: `You received ${data.coinsAwarded} coins. Streak: ${data.streakDays} days.` });
        refetchBalance(); refetchTx();
      },
      onError: (err) => toast({ title: "Claim Failed", description: (err as any).error || "Could not claim", variant: "destructive" }),
    }
  });

  const redeemMutation = useRedeemVoucher({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Voucher Redeemed!", description: `You received ${data.coinsAwarded} coins.` });
        setVoucherCode(""); refetchBalance(); refetchTx();
      },
      onError: (err) => toast({ title: "Redemption Failed", description: (err as any).error || "Invalid voucher", variant: "destructive" }),
    }
  });

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  if (balanceLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 mb-2" /><Skeleton className="h-5 w-96" />
        <div className="grid gap-6 md:grid-cols-3 mt-8">
          <Skeleton className="h-48 md:col-span-2" /><Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
          COIN WALLET
        </h1>
        <p className="text-muted-foreground font-mono mt-1">
          Manage your platform currency. Coins are used to pay for bot deployments.
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-3">
        <motion.div variants={item} className="md:col-span-2">
          <Card className="border-secondary/30 bg-card/60 backdrop-blur-xl relative overflow-hidden h-full">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-secondary/20 rounded-full blur-[80px] pointer-events-none" />
            <CardHeader className="pb-2">
              <CardTitle className="font-mono text-sm text-muted-foreground flex items-center gap-2">
                <Coins className="h-4 w-4" /> CURRENT BALANCE
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-secondary tracking-tighter drop-shadow-[0_0_15px_rgba(180,0,255,0.3)]">
                  {balance?.coins || 0}
                </span>
                <span className="text-xl font-mono text-muted-foreground">COINS</span>
              </div>
              <div className="flex gap-4 mt-8">
                <Button
                  className="font-mono bg-secondary hover:bg-secondary/90 text-primary-foreground shadow-[0_0_15px_rgba(180,0,255,0.3)]"
                  disabled={!balance?.canClaimToday || claimMutation.isPending}
                  onClick={() => claimMutation.mutate()}
                >
                  <Zap className="mr-2 h-4 w-4 fill-current" />
                  {balance?.canClaimToday ? "CLAIM DAILY BONUS" : "BONUS CLAIMED TODAY"}
                </Button>
                {balance && balance.streak > 0 && (
                  <Badge variant="outline" className="border-accent/30 text-accent font-mono bg-accent/5">
                    🔥 {balance.streak} DAY STREAK
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border/50 bg-card/40 backdrop-blur-sm h-full">
            <CardHeader>
              <CardTitle className="font-mono text-sm text-muted-foreground flex items-center gap-2">
                <Gift className="h-4 w-4" /> REDEEM VOUCHER
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); if (voucherCode.trim()) redeemMutation.mutate({ data: { code: voucherCode } }); }}
                className="space-y-4">
                <Input
                  placeholder="ENTER-CODE-HERE"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  className="font-mono uppercase bg-background/50 border-primary/20 focus-visible:ring-primary/50"
                />
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full font-mono border-primary/30 text-primary hover:bg-primary/10"
                  disabled={!voucherCode.trim() || redeemMutation.isPending}
                >
                  REDEEM CODE
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={item}>
        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="bg-background/50 border border-border/50 p-1">
            <TabsTrigger value="buy" className="font-mono text-xs text-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <CreditCard className="mr-1.5 h-3 w-3" /> BUY MORE COINS
            </TabsTrigger>
            <TabsTrigger value="history" className="font-mono text-xs">TRANSACTION HISTORY</TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="mt-4">
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              {COIN_PACKAGES.map((pkg) => (
                <Card key={pkg.id} className={`relative flex flex-col overflow-hidden transition-all ${
                  pkg.popular
                    ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(0,212,255,0.15)] scale-105 z-10"
                    : "border-border/50 bg-card/40 hover:border-primary/40 hover:shadow-md"
                }`}>
                  {pkg.popular && (
                    <div className="absolute top-0 inset-x-0 bg-primary text-primary-foreground text-[10px] font-black py-1 text-center font-mono">
                      MOST POPULAR
                    </div>
                  )}
                  <CardHeader className={`${pkg.popular ? "pt-8" : ""} text-center pb-2`}>
                    <CardTitle className="font-mono text-xs text-muted-foreground">{pkg.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-3xl font-black">{pkg.coins}</span>
                      <span className="text-xs font-mono text-muted-foreground ml-1">COINS</span>
                    </div>
                  </CardHeader>
                  <CardContent className="text-center pb-2 flex-1">
                    <div className="text-lg font-bold text-accent font-mono mb-2">KES {pkg.kes}</div>
                    {pkg.bonus > 0 ? (
                      <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 font-mono text-[10px] bg-yellow-500/5">
                        +{pkg.bonus} BONUS
                      </Badge>
                    ) : <div className="h-[22px]" />}
                  </CardContent>
                  <CardFooter>
                    <Button
                      className={`w-full font-mono font-bold ${
                        pkg.popular
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_10px_rgba(0,212,255,0.3)]"
                          : "bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/30"
                      }`}
                      onClick={() => setPayMode({
                        type: "coins",
                        packageId: pkg.id,
                        name: pkg.name,
                        kes: pkg.kes,
                        coins: pkg.coins,
                        bonus: pkg.bonus,
                      })}
                    >
                      <CreditCard className="mr-2 h-3 w-3" /> BUY NOW
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            <div className="mt-6 bg-background/20 rounded-xl border border-border/30 p-4 flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Coins className="h-4 w-4 text-primary" />
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                <strong className="text-foreground">How coins work:</strong> Each bot deployment costs coins based on your plan. Coins never expire. 
                All payments via M-Pesa STK Push — no card required.
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                  <History className="h-4 w-4" /> RECENT ACTIVITY
                </CardTitle>
              </CardHeader>
              <CardContent>
                {txLoading ? (
                  <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : transactions && transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            tx.amount > 0 ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
                          }`}>
                            {tx.amount > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium uppercase font-mono">{tx.type.replace("_", " ")}</p>
                            <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}
                            </p>
                          </div>
                        </div>
                        <div className={`font-mono font-bold ${tx.amount > 0 ? "text-accent" : "text-destructive"}`}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground font-mono text-sm border border-dashed border-border/50 rounded-lg">
                    No transactions yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      <PaymentModal
        open={!!payMode}
        onClose={() => { setPayMode(null); refetchBalance(); refetchTx(); }}
        mode={payMode}
      />
    </motion.div>
  );
}
