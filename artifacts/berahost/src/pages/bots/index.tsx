import { Link } from "wouter";
import { motion } from "framer-motion";
import { Bot, Terminal, Shield, ArrowRight, Zap, Play } from "lucide-react";
import { useListBots } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function BotsMarketplace() {
  const { data: bots, isLoading } = useListBots();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
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
      <motion.div variants={item}>
        <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
          BOT MARKETPLACE
        </h1>
        <p className="text-muted-foreground font-mono mt-1">
          Select a template to deploy. All bots are pre-configured for BERAHOST.
        </p>
      </motion.div>

      <motion.div variants={item} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {bots?.map((bot) => (
          <motion.div key={bot.id} variants={item} className="group">
            <Card className="border-border/50 bg-card/40 backdrop-blur-sm h-full flex flex-col hover:border-primary/50 transition-all hover:shadow-[0_0_20px_rgba(0,212,255,0.1)] relative overflow-hidden">
              {bot.isFeatured && (
                <div className="absolute top-0 right-0">
                  <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground text-[10px] font-black px-8 py-1 rotate-45 translate-x-6 translate-y-3 shadow-sm">
                    FEATURED
                  </div>
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">{bot.name}</CardTitle>
                    <Badge variant="outline" className="font-mono text-[10px] mt-1 bg-background/50">{bot.platform}</Badge>
                  </div>
                </div>
                <CardDescription className="text-sm line-clamp-2 mt-2">
                  {bot.description || "A powerful WhatsApp bot ready for deployment."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <Terminal className="h-3 w-3" /> v{bot.version}.0 Build
                  </div>
                  {bot.requiredVars && Object.keys(bot.requiredVars).length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      <Shield className="h-3 w-3 text-secondary" /> {Object.keys(bot.requiredVars).length} Environment Vars
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <Zap className="h-3 w-3 text-accent" /> Instant Deployment
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t border-border/50">
                <Link href={`/bots/${bot.id}`} className="w-full">
                  <Button className="w-full font-mono bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 group-hover:border-primary transition-all">
                    <Play className="mr-2 h-4 w-4" /> CONFIGURE & DEPLOY
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </motion.div>
        ))}

        {bots?.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-border/50 rounded-lg bg-card/20">
            <Bot className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-bold mb-2">No Bots Available</h3>
            <p className="text-muted-foreground font-mono">The marketplace is currently empty. Check back later.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
