import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Settings, 
  ArrowLeft,
  Save,
  Radio,
  MessageSquare,
  Coins,
  Loader2,
  Zap,
  Users
} from "lucide-react";
import { 
  useAdminGetSettings,
  useAdminUpdateSettings,
  useAdminSendBroadcast,
  useGetMe
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

const broadcastSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

const configSchema = z.object({
  signup_coins:              z.coerce.number().min(0).max(10000),
  daily_claim_coins:         z.coerce.number().min(0).max(10000),
  referral_bonus_referrer:   z.coerce.number().min(0).max(10000),
  referral_bonus_referred:   z.coerce.number().min(0).max(10000),
  deploy_cost_whatsapp:      z.coerce.number().min(0).max(10000),
  deploy_cost_telegram:      z.coerce.number().min(0).max(10000),
});

type ConfigForm = z.infer<typeof configSchema>;

export default function AdminSettings() {
  const { data: user } = useGetMe();
  const [, setLocation] = useLocation();
  const { data: settings, isLoading, refetch } = useAdminGetSettings();
  const updateSettings = useAdminUpdateSettings();
  const { toast } = useToast();
  const [configSaving, setConfigSaving] = useState(false);

  const broadcastForm = useForm<z.infer<typeof broadcastSchema>>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: { title: "", message: "" },
  });

  const configForm = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      signup_coins:            30,
      daily_claim_coins:       10,
      referral_bonus_referrer: 30,
      referral_bonus_referred: 10,
      deploy_cost_whatsapp:    30,
      deploy_cost_telegram:    20,
    },
  });

  // Populate config form once settings load
  useEffect(() => {
    if (!settings) return;
    const s = settings as Record<string, any>;
    configForm.reset({
      signup_coins:            Number(s.signup_coins)            || 30,
      daily_claim_coins:       Number(s.daily_claim_coins)       || 10,
      referral_bonus_referrer: Number(s.referral_bonus_referrer) || 30,
      referral_bonus_referred: Number(s.referral_bonus_referred) || 10,
      deploy_cost_whatsapp:    Number(s.deploy_cost_whatsapp)    || 30,
      deploy_cost_telegram:    Number(s.deploy_cost_telegram)    || 20,
    });
  }, [settings]);

  const broadcastMutation = useAdminSendBroadcast({
    mutation: {
      onSuccess: () => {
        toast({ title: "Broadcast Sent", description: "All users have been notified." });
        broadcastForm.reset();
      },
      onError: (err) => {
        toast({ title: "Error", description: err.error || "Failed to send broadcast", variant: "destructive" });
      }
    }
  });

  if (user && !user.isAdmin) {
    setLocation("/dashboard");
    return null;
  }

  const onBroadcastSubmit = (values: z.infer<typeof broadcastSchema>) => {
    broadcastMutation.mutate({ data: values });
  };

  async function onConfigSubmit(values: ConfigForm) {
    setConfigSaving(true);
    try {
      await updateSettings.mutateAsync({ data: values as any });
      await refetch();
      toast({ title: "Settings Saved", description: "Platform configuration updated successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setConfigSaving(false);
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" /> PLATFORM SETTINGS
          </h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">Configure coin economy and platform behaviour</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">

        {/* ── COIN ECONOMY CONFIG ─────────────────────────────────── */}
        <Card className="border-primary/30 bg-card/40 backdrop-blur-sm md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="font-mono text-sm flex items-center gap-2 text-primary">
              <Coins className="h-4 w-4" /> COIN ECONOMY
              <Badge variant="outline" className="ml-auto text-[10px] font-mono border-primary/30 text-primary">LIVE CONFIG</Badge>
            </CardTitle>
            <CardDescription className="text-xs font-mono">
              Changes take effect immediately for new users and actions. Existing balances are not affected.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (
              <form onSubmit={configForm.handleSubmit(onConfigSubmit)} className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

                  {/* Signup Coins */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase flex items-center gap-1">
                      <Users className="h-3 w-3" /> Signup Bonus
                    </label>
                    <Input
                      type="number"
                      min={0}
                      {...configForm.register("signup_coins")}
                      className="bg-background/50 font-mono border-primary/30 focus:border-primary"
                    />
                    <p className="text-[9px] font-mono text-muted-foreground">Coins new users receive on sign up</p>
                    {configForm.formState.errors.signup_coins && (
                      <p className="text-[10px] text-destructive">{configForm.formState.errors.signup_coins.message}</p>
                    )}
                  </div>

                  {/* Daily Claim */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Daily Claim
                    </label>
                    <Input
                      type="number"
                      min={0}
                      {...configForm.register("daily_claim_coins")}
                      className="bg-background/50 font-mono border-primary/30 focus:border-primary"
                    />
                    <p className="text-[9px] font-mono text-muted-foreground">Coins per daily check-in</p>
                  </div>

                  {/* Referral — Referrer */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase">Referral (You)</label>
                    <Input
                      type="number"
                      min={0}
                      {...configForm.register("referral_bonus_referrer")}
                      className="bg-background/50 font-mono border-primary/30 focus:border-primary"
                    />
                    <p className="text-[9px] font-mono text-muted-foreground">Coins when your referral signs up</p>
                  </div>

                  {/* Referral — Referred */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase">Referral (Invited)</label>
                    <Input
                      type="number"
                      min={0}
                      {...configForm.register("referral_bonus_referred")}
                      className="bg-background/50 font-mono border-primary/30 focus:border-primary"
                    />
                    <p className="text-[9px] font-mono text-muted-foreground">Bonus coins for the person invited</p>
                  </div>

                  {/* Deploy Cost — WhatsApp */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase">Deploy Cost (WhatsApp)</label>
                    <Input
                      type="number"
                      min={0}
                      {...configForm.register("deploy_cost_whatsapp")}
                      className="bg-background/50 font-mono border-primary/30 focus:border-primary"
                    />
                    <p className="text-[9px] font-mono text-muted-foreground">Coins charged per WhatsApp deployment</p>
                  </div>

                  {/* Deploy Cost — Telegram */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase">Deploy Cost (Telegram)</label>
                    <Input
                      type="number"
                      min={0}
                      {...configForm.register("deploy_cost_telegram")}
                      className="bg-background/50 font-mono border-primary/30 focus:border-primary"
                    />
                    <p className="text-[9px] font-mono text-muted-foreground">Coins charged per Telegram deployment</p>
                  </div>

                </div>

                <Button
                  type="submit"
                  className="font-mono bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                  disabled={configSaving}
                >
                  {configSaving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> SAVE CONFIGURATION</>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* ── SYSTEM BROADCAST ─────────────────────────────────────── */}
        <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-mono text-sm flex items-center gap-2 text-primary">
              <Radio className="h-4 w-4" /> SYSTEM BROADCAST
            </CardTitle>
            <CardDescription className="text-xs font-mono">
              Send a notification to all registered users immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...broadcastForm}>
              <form onSubmit={broadcastForm.handleSubmit(onBroadcastSubmit)} className="space-y-4">
                <FormField
                  control={broadcastForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Notification Title</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Free Coins This Week!" {...field} className="bg-background/50 font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={broadcastForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Broadcast Message</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide details..." 
                          className="min-h-[120px] bg-background/50 font-mono resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full font-mono bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,212,255,0.3)]" 
                  disabled={broadcastMutation.isPending}
                >
                  <MessageSquare className="mr-2 h-4 w-4" /> 
                  TRANSMIT TO ALL USERS
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* ── CURRENT VALUES SUMMARY ───────────────────────────────── */}
        <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-mono text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" /> ACTIVE VALUES
            </CardTitle>
            <CardDescription className="text-xs font-mono">
              What's currently live on the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <div className="space-y-2 font-mono text-xs">
                {[
                  { label: "Signup Bonus",         key: "signup_coins",            def: 30 },
                  { label: "Daily Claim",           key: "daily_claim_coins",       def: 10 },
                  { label: "Referral (Referrer)",   key: "referral_bonus_referrer", def: 30 },
                  { label: "Referral (Invited)",    key: "referral_bonus_referred", def: 10 },
                  { label: "Deploy Cost WhatsApp",  key: "deploy_cost_whatsapp",    def: 30 },
                  { label: "Deploy Cost Telegram",  key: "deploy_cost_telegram",    def: 20 },
                ].map(({ label, key, def }) => (
                  <div key={key} className="flex items-center justify-between p-2 rounded bg-background/30 border border-border/30">
                    <span className="text-muted-foreground">{label}</span>
                    <Badge variant="outline" className="font-mono text-accent border-accent/30 bg-accent/5">
                      {Number((settings as any)?.[key] ?? def)} coins
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </motion.div>
  );
}
