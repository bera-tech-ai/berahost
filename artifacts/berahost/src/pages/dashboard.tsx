import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  Server, 
  Bot, 
  Coins, 
  Activity, 
  PlayCircle, 
  StopCircle,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { 
  useGetMe, 
  useListDeployments, 
  useListBots,
  useGetCoinBalance
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: user, isLoading: userLoading } = useGetMe();
  const { data: deployments, isLoading: deploymentsLoading } = useListDeployments();
  const { data: bots, isLoading: botsLoading } = useListBots();
  const { data: coinBalance, isLoading: coinsLoading } = useGetCoinBalance();

  const activeDeployments = deployments?.filter(d => d.status === 'running') || [];
  const stoppedDeployments = deployments?.filter(d => d.status === 'stopped') || [];
  const crashedDeployments = deployments?.filter(d => d.status === 'crashed') || [];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (userLoading || deploymentsLoading || botsLoading || coinsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            COMMAND CENTER
          </h1>
          <p className="text-muted-foreground font-mono mt-1">
            Welcome back, <span className="text-primary">{user?.email}</span>. System nominal.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/bots">
            <Button className="font-mono bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_10px_rgba(0,212,255,0.3)]">
              <Bot className="mr-2 h-4 w-4" /> NEW DEPLOYMENT
            </Button>
          </Link>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
          <Card className="border-primary/20 bg-card/50 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-mono font-medium text-muted-foreground">Active Bots</CardTitle>
              <Server className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-primary">{activeDeployments.length}</div>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                Out of {deployments?.length || 0} total deployments
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-secondary/20 bg-card/50 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-mono font-medium text-muted-foreground">Available Coins</CardTitle>
              <Coins className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-secondary">{coinBalance?.coins || 0}</div>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                <Link href="/coins" className="text-secondary hover:underline cursor-pointer">Refill wallet →</Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-accent/20 bg-card/50 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-mono font-medium text-muted-foreground">System Status</CardTitle>
              <Activity className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-accent">
                {crashedDeployments.length > 0 ? 'WARNING' : 'OPTIMAL'}
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {crashedDeployments.length > 0 
                  ? <span className="text-destructive">{crashedDeployments.length} bots crashed</span> 
                  : 'All systems running smoothly'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-muted-foreground/20 bg-card/50 backdrop-blur-xl relative overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-mono font-medium text-muted-foreground">Current Plan</CardTitle>
              <Badge variant="outline" className="border-primary/50 text-primary font-mono uppercase">{user?.subscriptionPlan}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold mt-2">
                {user?.subscriptionPlan === 'free' ? 'Basic Access' : 'Premium Access'}
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                <Link href="/subscriptions" className="text-primary hover:underline cursor-pointer">Upgrade plan →</Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div variants={item}>
          <Card className="border-border/50 bg-card/30 backdrop-blur-sm h-full flex flex-col">
            <CardHeader>
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" /> RECENT DEPLOYMENTS
              </CardTitle>
              <CardDescription className="font-mono text-xs">Your active bot instances</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {deployments && deployments.length > 0 ? (
                <div className="space-y-4">
                  {deployments.slice(0, 5).map(dep => (
                    <div key={dep.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full shadow-[0_0_5px] ${
                          dep.status === 'running' ? 'bg-accent shadow-accent' : 
                          dep.status === 'stopped' ? 'bg-muted-foreground shadow-muted-foreground' : 
                          dep.status === 'deploying' ? 'bg-primary shadow-primary animate-pulse' :
                          'bg-destructive shadow-destructive'
                        }`} />
                        <div>
                          <div className="font-bold text-sm">{dep.bot?.name || `Bot #${dep.botId}`}</div>
                          <div className="text-xs text-muted-foreground font-mono">{dep.status.toUpperCase()}</div>
                        </div>
                      </div>
                      <Link href={`/deployments/${dep.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border/50 rounded-lg">
                  <Bot className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium mb-1">No Deployments Found</p>
                  <p className="text-xs text-muted-foreground font-mono mb-4">You haven't deployed any bots yet.</p>
                  <Link href="/bots">
                    <Button variant="outline" size="sm" className="font-mono border-primary/30 text-primary hover:bg-primary/10">
                      BROWSE MARKETPLACE
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border/50 bg-card/30 backdrop-blur-sm h-full flex flex-col">
            <CardHeader>
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-secondary" /> QUICK ACTIONS
              </CardTitle>
              <CardDescription className="font-mono text-xs">Platform shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="grid grid-cols-2 gap-3">
                <Link href="/bots">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all">
                    <Bot className="h-6 w-6 text-primary" />
                    <span className="font-mono text-xs">Marketplace</span>
                  </Button>
                </Link>
                <Link href="/coins">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 border-border/50 hover:border-secondary/50 hover:bg-secondary/5 transition-all">
                    <Coins className="h-6 w-6 text-secondary" />
                    <span className="font-mono text-xs">Buy Coins</span>
                  </Button>
                </Link>
                <Link href="/support">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 border-border/50 hover:border-accent/50 hover:bg-accent/5 transition-all">
                    <AlertTriangle className="h-6 w-6 text-accent" />
                    <span className="font-mono text-xs">Support Ticket</span>
                  </Button>
                </Link>
                <a href="https://wa.me/254787527753" target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 border-border/50 hover:border-green-500/50 hover:bg-green-500/5 transition-all">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-accent" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    <span className="font-mono text-xs">WhatsApp Support</span>
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
