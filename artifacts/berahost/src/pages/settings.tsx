import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Settings, 
  Shield, 
  User, 
  Save,
  Lock,
  LogOut
} from "lucide-react";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function SettingsPage() {
  const { data: user, isLoading } = useGetMe();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        setLocation("/login");
      }
    }
  });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 mt-8">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6 max-w-4xl mx-auto"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item}>
        <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" /> SYSTEM SETTINGS
        </h1>
        <p className="text-muted-foreground font-mono mt-1">
          Manage your profile, security, and account preferences.
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        <motion.div variants={item} className="space-y-6">
          <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> PROFILE IDENTITY
              </CardTitle>
              <CardDescription>Your personal account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary/30">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                    {user?.email?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg">{user?.email}</h3>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="font-mono text-[10px] bg-background/50">
                      {user?.isAdmin ? 'ADMIN' : 'USER'}
                    </Badge>
                    <Badge variant="outline" className="font-mono text-[10px] uppercase text-primary border-primary/30">
                      {user?.subscriptionPlan} PLAN
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground uppercase">Email Address</label>
                  <Input value={user?.email || ''} readOnly className="bg-background/30 font-mono text-muted-foreground cursor-not-allowed" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground uppercase">Phone Number</label>
                  <Input value={user?.phone || 'Not provided'} readOnly className="bg-background/30 font-mono text-muted-foreground cursor-not-allowed" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground uppercase">Account Created</label>
                  <Input value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''} readOnly className="bg-background/30 font-mono text-muted-foreground cursor-not-allowed" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="space-y-6">
          <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-secondary" /> SECURITY
              </CardTitle>
              <CardDescription>Password and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/20 flex items-start gap-3">
                <Lock className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-secondary">Password Protected</h4>
                  <p className="text-xs text-muted-foreground font-mono mt-1">Your account uses standard password authentication. Contact support to change your password.</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button 
                variant="outline" 
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 font-mono"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="mr-2 h-4 w-4" /> DISCONNECT SESSION
              </Button>
            </CardFooter>
          </Card>
          
          {user?.referralCode && (
            <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-accent" /> REFERRAL PROGRAM
                </CardTitle>
                <CardDescription>Share your code to earn bonuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase">Your Referral Code</label>
                  <Input value={user.referralCode} readOnly className="bg-accent/5 font-mono font-bold text-accent border-accent/30 text-center text-lg h-12" />
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
