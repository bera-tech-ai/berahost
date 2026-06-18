import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRegister, useGetMe } from "@workspace/api-client-react";
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
import { Loader2, MessageSquare, ArrowLeft, CheckCircle2, Shield } from "lucide-react";

const BASE = import.meta.env.BASE_URL;

const step1Schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(7, "Phone number is required for WhatsApp verification"),
  referralCode: z.string().optional(),
});

const step2Schema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits").regex(/^\d+$/, "OTP must be numeric"),
});

type Step1Form = z.infer<typeof step1Schema>;
type Step2Form = z.infer<typeof step2Schema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [step1Data, setStep1Data] = useState<Step1Form | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);

  const { refetch } = useGetMe({ query: { enabled: false } });

  const step1Form = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    defaultValues: { email: "", password: "", phone: "", referralCode: "" },
  });

  const step2Form = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
    defaultValues: { otp: "" },
  });

  const registerMutation = useRegister({
    mutation: {
      onSuccess: async () => {
        await refetch();
        toast({ title: "✅ Registration Complete", description: "Welcome to the BERAHOST network." });
        setLocation("/dashboard");
      },
      onError: (error) => {
        toast({ title: "Registration Failed", description: (error as any).error || "Could not create account", variant: "destructive" });
      },
    },
  });

  async function onStep1Submit(values: Step1Form) {
    setSendingOtp(true);
    try {
      const phone = values.phone.replace(/\D/g, "");
      const res = await fetch(`${BASE}api/auth/otp/send`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "OTP Failed", description: data.error || "Could not send OTP", variant: "destructive" });
        return;
      }
      setStep1Data(values);
      setStep(2);
      toast({ title: "📱 OTP Sent", description: "Check your WhatsApp for the 6-digit code." });
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setSendingOtp(false);
    }
  }

  function onStep2Submit(values: Step2Form) {
    if (!step1Data) return;
    registerMutation.mutate({
      data: {
        email: step1Data.email,
        password: step1Data.password,
        phone: step1Data.phone.replace(/\D/g, ""),
        referralCode: step1Data.referralCode || undefined,
        otp: values.otp,
      } as any,
    });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-secondary/10 via-background to-background pointer-events-none" />
      <div className="absolute -left-40 bottom-20 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -right-40 top-20 w-96 h-96 bg-secondary/20 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md z-10"
      >
        <Card className="border-secondary/30 bg-card/60 backdrop-blur-xl shadow-[0_0_30px_rgba(180,0,255,0.1)]">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary tracking-tight">
              BERAHOST
            </CardTitle>
            <CardDescription className="font-mono text-secondary/80">
              NEW DEPLOYER REGISTRATION
            </CardDescription>
            <div className="flex items-center justify-center gap-2 pt-2">
              <div className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full border transition-all ${step === 1 ? "border-secondary/60 bg-secondary/10 text-secondary" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"}`}>
                {step === 1 ? <Shield className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                IDENTITY
              </div>
              <div className="h-px w-6 bg-border" />
              <div className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full border transition-all ${step === 2 ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400" : "border-border/50 bg-muted/20 text-muted-foreground"}`}>
                <MessageSquare className="h-3 w-3" />
                VERIFY
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                  <Form {...step1Form}>
                    <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-4">
                      <FormField control={step1Form.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="deployer@berahost.net" {...field} className="bg-background/50 border-secondary/30 focus-visible:border-secondary focus-visible:ring-secondary/50 font-mono" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={step1Form.control} name="password" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Passcode</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} className="bg-background/50 border-secondary/30 focus-visible:border-secondary focus-visible:ring-secondary/50 font-mono" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={step1Form.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <MessageSquare className="h-3 w-3 text-emerald-400" /> WhatsApp Number
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="254712345678" {...field} className="bg-background/50 border-emerald-500/30 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/30 font-mono" />
                          </FormControl>
                          <p className="text-[10px] font-mono text-muted-foreground">Include country code — e.g. 254712345678</p>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={step1Form.control} name="referralCode" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Referral Code (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="OPTIONAL" {...field} className="bg-background/50 border-secondary/30 focus-visible:border-secondary focus-visible:ring-secondary/50 font-mono uppercase" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <Button
                        type="submit"
                        className="w-full font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all mt-2"
                        disabled={sendingOtp}
                      >
                        {sendingOtp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                        SEND OTP TO WHATSAPP
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              ) : (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <div className="mb-5 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-4 w-4 text-emerald-400" />
                      <span className="font-mono text-xs font-bold text-emerald-400">OTP SENT TO WHATSAPP</span>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">
                      A 6-digit code was sent to <span className="text-emerald-400 font-bold">{step1Data?.phone}</span>. Enter it below to verify.
                    </p>
                  </div>

                  <Form {...step2Form}>
                    <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-4">
                      <FormField control={step2Form.control} name="otp" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs text-muted-foreground uppercase tracking-wider">6-Digit OTP Code</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="000000"
                              maxLength={6}
                              inputMode="numeric"
                              {...field}
                              className="bg-background/50 border-emerald-500/40 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/30 font-mono text-center text-2xl tracking-[0.5em] h-14"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <Button
                        type="submit"
                        className="w-full font-mono font-bold bg-secondary hover:bg-secondary/90 text-primary-foreground shadow-[0_0_10px_rgba(180,0,255,0.3)] hover:shadow-[0_0_20px_rgba(180,0,255,0.5)] transition-all"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        ESTABLISH IDENTITY
                      </Button>

                      <Button type="button" variant="ghost" className="w-full font-mono text-xs text-muted-foreground" onClick={() => { setStep(1); step2Form.reset(); }}>
                        <ArrowLeft className="mr-1.5 h-3 w-3" /> Back — Resend OTP
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 text-center text-sm border-t border-border/50 pt-6">
            <div className="text-muted-foreground font-mono text-xs">
              Already registered?{" "}
              <Link href="/login" className="text-secondary hover:text-secondary/80 underline underline-offset-4 decoration-secondary/30">
                Initialize Session
              </Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
