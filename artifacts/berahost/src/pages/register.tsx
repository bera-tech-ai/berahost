import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
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
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  referralCode: z.string().optional(),
});

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { refetch } = useGetMe({
    query: {
      enabled: false,
    }
  });

  const registerMutation = useRegister({
    mutation: {
      onSuccess: async () => {
        await refetch();
        toast({
          title: "Registration Complete",
          description: "Welcome to BERAHOST network.",
        });
        setLocation("/dashboard");
      },
      onError: (error) => {
        toast({
          title: "Registration Failed",
          description: error.error || "Could not create account",
          variant: "destructive",
        });
      },
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      phone: "",
      referralCode: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    registerMutation.mutate({ data: values });
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
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="deployer@berahost.net" 
                          {...field} 
                          className="bg-background/50 border-secondary/30 focus-visible:border-secondary focus-visible:ring-secondary/50 font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Passcode</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          {...field} 
                          className="bg-background/50 border-secondary/30 focus-visible:border-secondary focus-visible:ring-secondary/50 font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+254..." 
                            {...field} 
                            className="bg-background/50 border-secondary/30 focus-visible:border-secondary focus-visible:ring-secondary/50 font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="referralCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Referral Code</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="OPTIONAL" 
                            {...field} 
                            className="bg-background/50 border-secondary/30 focus-visible:border-secondary focus-visible:ring-secondary/50 font-mono uppercase"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full font-mono font-bold bg-secondary hover:bg-secondary/90 text-primary-foreground shadow-[0_0_10px_rgba(180,0,255,0.3)] hover:shadow-[0_0_20px_rgba(180,0,255,0.5)] transition-all mt-4"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  ESTABLISH IDENTITY
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 text-center text-sm border-t border-border/50 pt-6">
            <div className="text-muted-foreground font-mono text-xs">
              Already registered? <Link href="/login" className="text-secondary hover:text-secondary/80 underline underline-offset-4 decoration-secondary/30">Initialize Session</Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
