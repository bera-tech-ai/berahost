import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin, useGetMe } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MessageSquare, ArrowLeft, CheckCircle2, KeyRound, RotateCcw } from "lucide-react";

const BASE = import.meta.env.BASE_URL;

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const forgotStep1Schema = z.object({
  email: z.string().email("Invalid email address"),
});

const forgotStep2Schema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits").regex(/^\d+$/, "Digits only"),
  newPassword: z.string().min(6, "At least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;
type ForgotStep1Form = z.infer<typeof forgotStep1Schema>;
type ForgotStep2Form = z.infer<typeof forgotStep2Schema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resettingPw, setResettingPw] = useState(false);

  const { refetch } = useGetMe({ query: { enabled: false } });

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const forgotStep1Form = useForm<ForgotStep1Form>({
    resolver: zodResolver(forgotStep1Schema),
    defaultValues: { email: "" },
  });

  const forgotStep2Form = useForm<ForgotStep2Form>({
    resolver: zodResolver(forgotStep2Schema),
    defaultValues: { otp: "", newPassword: "" },
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: async () => {
        await refetch();
        toast({ title: "Access Granted", description: "Welcome to BERAHOST network." });
        setLocation("/dashboard");
      },
      onError: (error) => {
        toast({ title: "Access Denied", description: (error as any).error || "Invalid credentials", variant: "destructive" });
      },
    },
  });

  function onLoginSubmit(values: LoginForm) {
    loginMutation.mutate({ data: values });
  }

  async function onForgotStep1Submit(values: ForgotStep1Form) {
    setSendingOtp(true);
    try {
      const res = await fetch(`${BASE}api/auth/otp/forgot-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error || "Could not send OTP", variant: "destructive" });
        return;
      }
      setForgotEmail(values.email);
      setForgotStep(2);
      toast({ title: "📱 OTP Sent", description: "Check your registered WhatsApp number." });
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setSendingOtp(false);
    }
  }

  async function onForgotStep2Submit(values: ForgotStep2Form) {
    setResettingPw(true);
    try {
      const res = await fetch(`${BASE}api/auth/otp/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, otp: values.otp, newPassword: values.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Reset Failed", description: data.error || "Could not reset password", variant: "destructive" });
        return;
      }
      toast({ title: "✅ Password Reset", description: "You can now log in with your new password." });
      setMode("login");
      setForgotStep(1);
      forgotStep1Form.reset();
      forgotStep2Form.reset();
      loginForm.setValue("email", forgotEmail);
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setResettingPw(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      <div className="absolute -left-40 top-20 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -right-40 bottom-20 w-96 h-96 bg-secondary/20 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <Card className="border-primary/20 bg-card/50 backdrop-blur-xl shadow-[0_0_30px_rgba(0,212,255,0.1)]">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary tracking-tight">
              BERAHOST
            </CardTitle>
            <CardDescription className="font-mono text-primary/70">
              {mode === "login" ? "AUTHENTICATION REQUIRED" : "PASSWORD RECOVERY"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              {mode === "login" ? (
                <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField control={loginForm.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="deployer@berahost.net" {...field} className="bg-background/50 border-primary/30 focus-visible:border-primary focus-visible:ring-primary/50 font-mono transition-all" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={loginForm.control} name="password" render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Passcode</FormLabel>
                            <button
                              type="button"
                              onClick={() => { setMode("forgot"); setForgotStep(1); forgotStep1Form.setValue("email", loginForm.getValues("email")); }}
                              className="text-[10px] font-mono text-primary/60 hover:text-primary underline underline-offset-2 transition-colors"
                            >
                              Forgot Password?
                            </button>
                          </div>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} className="bg-background/50 border-primary/30 focus-visible:border-primary focus-visible:ring-primary/50 font-mono transition-all" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button
                        type="submit"
                        className="w-full font-mono font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_10px_rgba(0,212,255,0.3)] hover:shadow-[0_0_20px_rgba(0,212,255,0.5)] transition-all mt-4"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                        INITIALIZE SESSION
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              ) : forgotStep === 1 ? (
                <motion.div key="forgot1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <div className="mb-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <p className="text-xs font-mono text-muted-foreground">
                      Enter your email — we'll send an OTP to your <span className="text-primary">registered WhatsApp number</span>.
                    </p>
                  </div>
                  <Form {...forgotStep1Form}>
                    <form onSubmit={forgotStep1Form.handleSubmit(onForgotStep1Submit)} className="space-y-4">
                      <FormField control={forgotStep1Form.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Your Email</FormLabel>
                          <FormControl>
                            <Input placeholder="deployer@berahost.net" {...field} className="bg-background/50 border-primary/30 focus-visible:border-primary focus-visible:ring-primary/50 font-mono" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button
                        type="submit"
                        className="w-full font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                        disabled={sendingOtp}
                      >
                        {sendingOtp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                        SEND OTP TO WHATSAPP
                      </Button>
                      <Button type="button" variant="ghost" className="w-full font-mono text-xs text-muted-foreground" onClick={() => setMode("login")}>
                        <ArrowLeft className="mr-1.5 h-3 w-3" /> Back to Login
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              ) : (
                <motion.div key="forgot2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <div className="mb-4 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="font-mono text-xs font-bold text-emerald-400">OTP SENT</span>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">
                      Check the WhatsApp registered with <span className="text-emerald-400">{forgotEmail}</span>.
                    </p>
                  </div>
                  <Form {...forgotStep2Form}>
                    <form onSubmit={forgotStep2Form.handleSubmit(onForgotStep2Submit)} className="space-y-4">
                      <FormField control={forgotStep2Form.control} name="otp" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs text-muted-foreground uppercase tracking-wider">6-Digit OTP</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="000000"
                              maxLength={6}
                              inputMode="numeric"
                              {...field}
                              className="bg-background/50 border-emerald-500/40 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/30 font-mono text-center text-2xl tracking-[0.5em] h-12"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={forgotStep2Form.control} name="newPassword" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs text-muted-foreground uppercase tracking-wider">New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} className="bg-background/50 border-primary/30 focus-visible:border-primary focus-visible:ring-primary/50 font-mono" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button
                        type="submit"
                        className="w-full font-mono font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_10px_rgba(0,212,255,0.3)] transition-all"
                        disabled={resettingPw}
                      >
                        {resettingPw ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        RESET PASSWORD
                      </Button>
                      <Button type="button" variant="ghost" className="w-full font-mono text-xs text-muted-foreground" onClick={() => { setForgotStep(1); forgotStep2Form.reset(); }}>
                        <RotateCcw className="mr-1.5 h-3 w-3" /> Resend OTP
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 text-center text-sm border-t border-border/50 pt-6">
            <div className="text-muted-foreground font-mono text-xs">
              No clearance?{" "}
              <Link href="/register" className="text-primary hover:text-primary/80 underline underline-offset-4 decoration-primary/30">
                Request Access
              </Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
