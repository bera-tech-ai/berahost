import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
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
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { refetch } = useGetMe({
    query: {
      enabled: false,
    }
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: async () => {
        await refetch();
        toast({
          title: "Access Granted",
          description: "Welcome to BERAHOST network.",
        });
        setLocation("/dashboard");
      },
      onError: (error) => {
        toast({
          title: "Access Denied",
          description: error.error || "Invalid credentials",
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
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    loginMutation.mutate({ data: values });
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
              AUTHENTICATION REQUIRED
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
                          className="bg-background/50 border-primary/30 focus-visible:border-primary focus-visible:ring-primary/50 font-mono transition-all"
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
                          className="bg-background/50 border-primary/30 focus-visible:border-primary focus-visible:ring-primary/50 font-mono transition-all"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full font-mono font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_10px_rgba(0,212,255,0.3)] hover:shadow-[0_0_20px_rgba(0,212,255,0.5)] transition-all mt-4"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  INITIALIZE SESSION
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 text-center text-sm border-t border-border/50 pt-6">
            <div className="text-muted-foreground font-mono text-xs">
              No clearance? <Link href="/register" className="text-primary hover:text-primary/80 underline underline-offset-4 decoration-primary/30">Request Access</Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
