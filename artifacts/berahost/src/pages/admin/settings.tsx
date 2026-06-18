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
  Users,
  CreditCard,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  Lock,
  PhoneCall,
  Wifi,
  WifiOff,
  Copy,
  XCircle,
  AlertCircle
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
import { Label } from "@/components/ui/label";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL;

const adminPasswordSchema = z
  .object({
    newPassword: z.string().min(6, "At least 6 characters"),
    confirmPassword: z.string().min(1, "Required"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type AdminPasswordForm = z.infer<typeof adminPasswordSchema>;

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

const payheroSchema = z.object({
  payhero_auth_token: z.string().min(1, "Auth token is required"),
  payhero_channel_id: z.string().min(1, "Channel ID is required"),
});
type PayheroForm = z.infer<typeof payheroSchema>;

export default function AdminSettings() {
  const { data: user } = useGetMe();
  const [, setLocation] = useLocation();
  const { data: settings, isLoading, refetch } = useAdminGetSettings();
  const updateSettings = useAdminUpdateSettings();
  const { toast } = useToast();
  const [configSaving, setConfigSaving] = useState(false);
  const [payheroSaving, setPayheroSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [payheroSaved, setPayheroSaved] = useState(false);
  const [adminPwSaving, setAdminPwSaving] = useState(false);
  const [showAdminPw, setShowAdminPw] = useState(false);
  const [showAdminPwConfirm, setShowAdminPwConfirm] = useState(false);

  // ── PLATFORM WA SENDER STATE ─────────────────────────────────────────────
  const [waStatus, setWaStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [waPairCode, setWaPairCode] = useState<string | null>(null);
  const [waPairPhone, setWaPairPhone] = useState("");
  const [waConnecting, setWaConnecting] = useState(false);
  const [waDisconnecting, setWaDisconnecting] = useState(false);
  const waSseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Load initial WA status
    fetch(`${BASE}api/admin/platform-wa/status`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.status) setWaStatus(d.status); })
      .catch(() => {});
    return () => { waSseRef.current?.close(); };
  }, []);

  function closeSse() {
    waSseRef.current?.close();
    waSseRef.current = null;
  }

  function startPairSse() {
    if (!waPairPhone.trim()) {
      toast({ title: "Phone required", description: "Enter the platform WhatsApp number", variant: "destructive" });
      return;
    }
    closeSse();
    setWaConnecting(true);
    setWaPairCode(null);
    setWaStatus("connecting");
    const phone = waPairPhone.replace(/\D/g, "");
    const es = new EventSource(`${BASE}api/admin/platform-wa/pair?number=${phone}`, { withCredentials: true } as any);
    waSseRef.current = es;
    es.addEventListener("code", (e) => {
      const raw = (e as MessageEvent).data;
      try { setWaPairCode(JSON.parse(raw)?.code ?? raw); } catch { setWaPairCode(raw); }
    });
    es.addEventListener("connected", () => {
      setWaStatus("connected");
      setWaPairCode(null);
      setWaConnecting(false);
      closeSse();
      toast({ title: "✅ WhatsApp Connected", description: "Platform sender is now live." });
    });
    es.addEventListener("error", (e: any) => {
      const msg = e.data ? JSON.parse(e.data)?.error : "Connection failed";
      toast({ title: "WA Error", description: msg || "Could not connect", variant: "destructive" });
      setWaStatus("disconnected");
      setWaConnecting(false);
      setWaPairCode(null);
      closeSse();
    });
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) setWaConnecting(false);
    };
  }

  async function disconnectWa() {
    setWaDisconnecting(true);
    closeSse();
    try {
      await fetch(`${BASE}api/admin/platform-wa/disconnect`, { method: "POST", credentials: "include" });
      setWaStatus("disconnected");
      setWaPairCode(null);
      toast({ title: "Disconnected", description: "Platform WhatsApp sender disconnected." });
    } catch {
      toast({ title: "Error", description: "Could not disconnect", variant: "destructive" });
    } finally {
      setWaDisconnecting(false);
    }
  }

  const adminPasswordForm = useForm<AdminPasswordForm>({
    resolver: zodResolver(adminPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const payheroForm = useForm<PayheroForm>({
    resolver: zodResolver(payheroSchema),
    defaultValues: { payhero_auth_token: "", payhero_channel_id: "" },
  });

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
    if (s.payhero_auth_token || s.payhero_channel_id) {
      payheroForm.reset({
        payhero_auth_token: String(s.payhero_auth_token || ""),
        payhero_channel_id: String(s.payhero_channel_id || ""),
      });
      setPayheroSaved(true);
    }
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

  async function onPayheroSubmit(values: PayheroForm) {
    setPayheroSaving(true);
    try {
      await updateSettings.mutateAsync({ data: values as any });
      await refetch();
      setPayheroSaved(true);
      toast({ title: "PayHero Credentials Saved", description: "M-Pesa payments are now configured." });
    } catch {
      toast({ title: "Error", description: "Failed to save PayHero credentials.", variant: "destructive" });
    } finally {
      setPayheroSaving(false);
    }
  }

  async function onAdminPasswordSubmit(values: AdminPasswordForm) {
    setAdminPwSaving(true);
    try {
      const res = await fetch(`${BASE}api/auth/admin/set-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: values.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      adminPasswordForm.reset();
      toast({ title: "Password Updated", description: "Your admin password has been changed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "Failed to update password.", variant: "destructive" });
    } finally {
      setAdminPwSaving(false);
    }
  }

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

        {/* ── PAYHERO CREDENTIALS ──────────────────────────────────── */}
        <Card className="border-emerald-500/30 bg-card/40 backdrop-blur-sm md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="font-mono text-sm flex items-center gap-2 text-emerald-400">
              <CreditCard className="h-4 w-4" /> PAYHERO / M-PESA CREDENTIALS
              {payheroSaved && (
                <Badge variant="outline" className="ml-auto text-[10px] font-mono border-emerald-500/40 text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> CONFIGURED
                </Badge>
              )}
              {!payheroSaved && (
                <Badge variant="outline" className="ml-auto text-[10px] font-mono border-yellow-500/40 text-yellow-400">NOT SET</Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs font-mono">
              These credentials are used for all M-Pesa STK push payments. You can get them from your{" "}
              <a href="https://app.payhero.co.ke" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline underline-offset-2">PayHero dashboard</a>.
              Env vars <code className="bg-muted/30 px-1 rounded text-[10px]">PAYHERO_AUTH_TOKEN</code> and{" "}
              <code className="bg-muted/30 px-1 rounded text-[10px]">PAYHERO_CHANNEL_ID</code> take priority if set.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={payheroForm.handleSubmit(onPayheroSubmit)} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase flex items-center gap-1">
                    Auth Token (Base64)
                  </label>
                  <div className="relative">
                    <Input
                      type={showToken ? "text" : "password"}
                      placeholder="Paste your PayHero Basic auth token..."
                      {...payheroForm.register("payhero_auth_token")}
                      className="bg-background/50 font-mono border-emerald-500/20 focus:border-emerald-500 pr-10 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(v => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {payheroForm.formState.errors.payhero_auth_token && (
                    <p className="text-[10px] text-destructive">{payheroForm.formState.errors.payhero_auth_token.message}</p>
                  )}
                  <p className="text-[9px] font-mono text-muted-foreground">
                    Found under API Keys in your PayHero account. Format: <code className="bg-muted/20 px-0.5">username:password</code> encoded in Base64.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase flex items-center gap-1">
                    Channel ID
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 1234"
                    {...payheroForm.register("payhero_channel_id")}
                    className="bg-background/50 font-mono border-emerald-500/20 focus:border-emerald-500 text-xs"
                  />
                  {payheroForm.formState.errors.payhero_channel_id && (
                    <p className="text-[10px] text-destructive">{payheroForm.formState.errors.payhero_channel_id.message}</p>
                  )}
                  <p className="text-[9px] font-mono text-muted-foreground">
                    The numeric channel ID from your PayHero M-Pesa integration.
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                className="font-mono bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                disabled={payheroSaving}
              >
                {payheroSaving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> SAVE PAYHERO CREDENTIALS</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── PLATFORM WHATSAPP SENDER ─────────────────────────────── */}
        <Card className="border-emerald-500/30 bg-card/40 backdrop-blur-sm md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="font-mono text-sm flex items-center gap-2 text-emerald-400">
              <MessageSquare className="h-4 w-4" /> PLATFORM WHATSAPP SENDER
              {waStatus === "connected" && (
                <Badge variant="outline" className="ml-auto text-[10px] font-mono border-emerald-500/50 text-emerald-400 flex items-center gap-1">
                  <Wifi className="h-3 w-3" /> CONNECTED
                </Badge>
              )}
              {waStatus === "connecting" && (
                <Badge variant="outline" className="ml-auto text-[10px] font-mono border-yellow-500/50 text-yellow-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> CONNECTING
                </Badge>
              )}
              {waStatus === "disconnected" && (
                <Badge variant="outline" className="ml-auto text-[10px] font-mono border-destructive/50 text-destructive flex items-center gap-1">
                  <WifiOff className="h-3 w-3" /> DISCONNECTED
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs font-mono">
              Connect a dedicated WhatsApp number to send OTP codes and crash alerts. Session is saved between restarts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {waStatus === "connected" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-mono text-sm font-bold text-emerald-400">Platform WhatsApp Sender is Active</p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">OTP codes and crash alerts will be delivered via this number.</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="font-mono border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={disconnectWa}
                  disabled={waDisconnecting}
                >
                  {waDisconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                  DISCONNECT SENDER
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-mono text-muted-foreground">
                  Enter the platform WhatsApp number. A pairing code will be generated — enter it in WhatsApp → Settings → Linked Devices → Link with phone number.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="254712345678"
                    value={waPairPhone}
                    onChange={e => setWaPairPhone(e.target.value)}
                    className="bg-background/50 border-emerald-500/20 focus:border-emerald-500 font-mono flex-1"
                    disabled={waConnecting}
                  />
                  <Button
                    className="font-mono bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
                    onClick={startPairSse}
                    disabled={waConnecting || !waPairPhone.trim()}
                  >
                    {waConnecting && !waPairCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
                  </Button>
                </div>
                {waPairCode && (
                  <div className="flex items-center gap-4 p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                    <div>
                      <p className="font-mono text-[10px] text-muted-foreground uppercase mb-1">Pairing Code</p>
                      <p className="font-mono text-3xl font-black tracking-[0.3em] text-emerald-400">{waPairCode}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ml-auto text-muted-foreground hover:text-foreground"
                      onClick={() => { navigator.clipboard.writeText(waPairCode); toast({ title: "Copied!" }); }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {waConnecting && !waPairCode && (
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Requesting pair code from WhatsApp...
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

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

        {/* ── ADMIN PASSWORD ───────────────────────────────────────── */}
        <Card className="border-primary/30 bg-card/40 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-mono text-sm flex items-center gap-2 text-primary">
              <KeyRound className="h-4 w-4" /> ADMIN PASSWORD
            </CardTitle>
            <CardDescription className="text-xs font-mono">
              Change your own admin password — no current password required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={adminPasswordForm.handleSubmit(onAdminPasswordSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase">New Password</Label>
                <div className="relative">
                  <Input
                    type={showAdminPw ? "text" : "password"}
                    placeholder="At least 6 characters"
                    {...adminPasswordForm.register("newPassword")}
                    className="bg-background/50 font-mono border-primary/30 focus:border-primary pr-10"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowAdminPw(v => !v)}>
                    {showAdminPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {adminPasswordForm.formState.errors.newPassword && (
                  <p className="text-[10px] text-destructive">{adminPasswordForm.formState.errors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    type={showAdminPwConfirm ? "text" : "password"}
                    placeholder="Repeat new password"
                    {...adminPasswordForm.register("confirmPassword")}
                    className="bg-background/50 font-mono border-primary/30 focus:border-primary pr-10"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowAdminPwConfirm(v => !v)}>
                    {showAdminPwConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {adminPasswordForm.formState.errors.confirmPassword && (
                  <p className="text-[10px] text-destructive">{adminPasswordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="font-mono bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                disabled={adminPwSaving}
              >
                {adminPwSaving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
                ) : (
                  <><Lock className="mr-2 h-4 w-4" /> SET NEW PASSWORD</>
                )}
              </Button>
            </form>
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
