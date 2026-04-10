import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Bot, 
  Server, 
  Coins, 
  CreditCard, 
  ShieldCheck, 
  Bell, 
  LifeBuoy, 
  KeyRound, 
  Settings, 
  LogOut,
  Menu,
  ChevronRight,
  User as UserIcon,
  ShieldAlert,
  Users,
  Github,
  Trophy,
  Send,
  Gift
} from "lucide-react";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        setLocation("/login");
      }
    }
  });

  const isNavActive = (path: string) => {
    if (path === "/dashboard" && location === "/dashboard") return true;
    if (path !== "/dashboard" && location.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Marketplace", href: "/bots", icon: Bot },
    { name: "Submit Bot", href: "/submit-bot", icon: Send },
    { name: "Deployments", href: "/deployments", icon: Server },
    { name: "Teams", href: "/teams", icon: Users },
    { name: "GitHub Deploy", href: "/github", icon: Github },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { name: "Referrals", href: "/referrals", icon: Gift },
    { name: "Wallet", href: "/coins", icon: Coins },
    { name: "Payments", href: "/payments", icon: CreditCard },
    { name: "Subscription", href: "/subscriptions", icon: ShieldCheck },
  ];

  const bottomNavItems = [
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "Support", href: "/support", icon: LifeBuoy },
    { name: "API Keys", href: "/api-keys", icon: KeyRound },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  if (user?.isAdmin) {
    bottomNavItems.push({ name: "Admin Panel", href: "/admin", icon: ShieldAlert });
  }

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <div className="flex flex-col gap-1 py-4 w-full">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} onClick={onClick}>
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-mono transition-all border ${
            isNavActive(item.href) 
              ? "bg-primary/10 text-primary border-primary/20 shadow-[inset_0_0_10px_rgba(0,212,255,0.05)]" 
              : "text-muted-foreground hover:bg-white/5 border-transparent hover:text-foreground"
          }`}>
            <item.icon className="h-4 w-4" />
            {item.name}
            {isNavActive(item.href) && <ChevronRight className="ml-auto h-4 w-4 text-primary/50" />}
          </div>
        </Link>
      ))}
      <Separator className="my-4 bg-border/50" />
      {bottomNavItems.map((item) => (
        <Link key={item.href} href={item.href} onClick={onClick}>
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-mono transition-all border ${
            isNavActive(item.href) 
              ? item.name === "Admin Panel" 
                ? "bg-destructive/10 text-destructive border-destructive/20" 
                : "bg-primary/10 text-primary border-primary/20"
              : item.name === "Admin Panel"
                ? "text-destructive/70 hover:bg-destructive/10 border-transparent hover:text-destructive"
                : "text-muted-foreground hover:bg-white/5 border-transparent hover:text-foreground"
          }`}>
            <item.icon className="h-4 w-4" />
            {item.name}
          </div>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/30 backdrop-blur-xl h-screen sticky top-0">
        <div className="p-6">
          <Link href="/dashboard">
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary tracking-tight cursor-pointer">
              BERAHOST
            </h2>
          </Link>
        </div>
        <ScrollArea className="flex-1 px-4">
          <NavLinks />
        </ScrollArea>
        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center gap-3 px-2 py-3">
            <Avatar className="h-9 w-9 border border-primary/30">
              <AvatarFallback className="bg-background text-primary font-mono font-bold">
                {user?.email.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user?.email}</span>
              <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                <Coins className="h-3 w-3 text-secondary" /> {user?.coins || 0} Coins
              </span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-mono text-sm mt-2"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            DISCONNECT
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-40">
          <Link href="/dashboard">
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary tracking-tight">
              BERAHOST
            </h2>
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-card border-r-primary/20 flex flex-col">
              <div className="p-6 border-b border-border/50">
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary tracking-tight">
                  BERAHOST
                </h2>
              </div>
              <ScrollArea className="flex-1 px-4">
                <NavLinks />
              </ScrollArea>
              <div className="p-4 border-t border-border/50 mt-auto bg-background/50">
                <div className="flex items-center gap-3 px-2 py-3 mb-2">
                  <Avatar className="h-9 w-9 border border-primary/30">
                    <AvatarFallback className="bg-background text-primary font-mono font-bold">
                      {user?.email.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium truncate">{user?.email}</span>
                    <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                      <Coins className="h-3 w-3 text-secondary" /> {user?.coins || 0} Coins
                    </span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 font-mono border-destructive/30"
                  onClick={() => logoutMutation.mutate()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  DISCONNECT
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
