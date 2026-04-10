import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  Server, 
  Terminal, 
  PlayCircle, 
  StopCircle, 
  Trash2, 
  Settings2,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { useListDeployments, useStopDeployment, useStartDeployment, useDeleteDeployment } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";

export default function Deployments() {
  const { data: deployments, isLoading, isError, refetch } = useListDeployments();
  const { toast } = useToast();

  const stopMutation = useStopDeployment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Signal Sent", description: "Instance stopping sequence initiated." });
        refetch();
      },
      onError: (err) => {
        toast({ title: "Error", description: err.error, variant: "destructive" });
      }
    }
  });

  const startMutation = useStartDeployment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Signal Sent", description: "Instance starting sequence initiated." });
        refetch();
      },
      onError: (err) => {
        toast({ title: "Error", description: err.error, variant: "destructive" });
      }
    }
  });

  const deleteMutation = useDeleteDeployment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Instance Terminated", description: "Deployment permanently deleted." });
        refetch();
      },
      onError: (err) => {
        toast({ title: "Error", description: err.error, variant: "destructive" });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-accent/10 text-accent border-accent/20';
      case 'stopped': return 'bg-muted/50 text-muted-foreground border-border';
      case 'deploying': return 'bg-primary/10 text-primary border-primary/20 animate-pulse';
      case 'crashed': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            ACTIVE DEPLOYMENTS
          </h1>
        </div>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-12 w-12 text-destructive/50 mb-4" />
            <h3 className="text-xl font-bold mb-2 font-mono">Failed to Load Deployments</h3>
            <p className="text-muted-foreground font-mono mb-6 text-sm">
              Could not retrieve your deployments. Please try again.
            </p>
            <Button onClick={() => refetch()} className="font-mono">
              <RefreshCw className="mr-2 h-4 w-4" /> RETRY
            </Button>
          </CardContent>
        </Card>
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
      <motion.div variants={item} className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            ACTIVE DEPLOYMENTS
          </h1>
          <p className="text-muted-foreground font-mono mt-1">
            Manage your bot instances and monitor real-time logs.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()} className="border-border/50 hover:bg-background/80">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </motion.div>

      {deployments && deployments.length > 0 ? (
        <motion.div variants={item} className="grid gap-4">
          {deployments.map((dep) => (
            <Card key={dep.id} className="border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden group hover:border-primary/30 transition-all">
              <div className="flex flex-col md:flex-row">
                {/* Status Indicator Bar */}
                <div className={`w-full md:w-2 h-2 md:h-auto ${
                  dep.status === 'running' ? 'bg-accent' : 
                  dep.status === 'stopped' ? 'bg-muted-foreground/30' : 
                  dep.status === 'deploying' ? 'bg-primary' : 'bg-destructive'
                }`} />
                
                <div className="flex-1 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-background/50 border border-border flex items-center justify-center">
                      <Server className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold">{dep.bot?.name || `Instance #${dep.id}`}</h3>
                        <Badge variant="outline" className={`font-mono text-xs uppercase ${getStatusColor(dep.status)}`}>
                          {dep.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground font-mono">
                        <span>ID: {dep.id}</span>
                        {dep.createdAt && (
                          <span>Created {formatDistanceToNow(new Date(dep.createdAt), { addSuffix: true })}</span>
                        )}
                        {dep.pid && (
                          <span>PID: {dep.pid}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Link href={`/deployments/${dep.id}`}>
                      <Button variant="outline" className="font-mono border-primary/20 text-primary hover:bg-primary/10">
                        <Terminal className="mr-2 h-4 w-4" /> CONSOLE
                      </Button>
                    </Link>
                    
                    {dep.status === 'running' || dep.status === 'deploying' ? (
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                        onClick={() => stopMutation.mutate({ id: dep.id })}
                        disabled={stopMutation.isPending}
                        title="Stop Instance"
                      >
                        <StopCircle className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="border-border/50 hover:bg-accent/10 hover:text-accent hover:border-accent/30"
                        onClick={() => startMutation.mutate({ id: dep.id })}
                        disabled={startMutation.isPending}
                        title="Start Instance"
                      >
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                          title="Terminate Instance"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-destructive/30 bg-card/95 backdrop-blur-xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" /> Terminate Instance?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="font-mono">
                            This action cannot be undone. This will permanently delete the deployment, container, and all associated logs.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="font-mono">CANCEL</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-destructive hover:bg-destructive/90 font-mono text-destructive-foreground"
                            onClick={() => deleteMutation.mutate({ id: dep.id })}
                          >
                            CONFIRM TERMINATION
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </motion.div>
      ) : (
        <motion.div variants={item}>
          <Card className="border-dashed border-border/50 bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <Server className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-bold mb-2">No Active Deployments</h3>
              <p className="text-muted-foreground font-mono mb-6 max-w-sm">
                You haven't deployed any bots yet. Head over to the marketplace to spin up your first instance.
              </p>
              <Link href="/bots">
                <Button className="font-mono bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,212,255,0.3)]">
                  BROWSE MARKETPLACE
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
