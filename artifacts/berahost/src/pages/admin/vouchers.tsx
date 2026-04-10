import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Ticket, 
  ArrowLeft,
  Plus,
  Coins,
  Copy
} from "lucide-react";
import { 
  useAdminListVouchers, 
  useAdminCreateVoucher,
  useGetMe
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const voucherSchema = z.object({
  code: z.string().min(4, "Code must be at least 4 characters").toUpperCase(),
  coinValue: z.coerce.number().min(1, "Must have a value"),
  maxUses: z.coerce.number().min(1, "Must allow at least 1 use"),
});

export default function AdminVouchers() {
  const { data: user } = useGetMe();
  const [, setLocation] = useLocation();
  const { data: vouchers, isLoading, refetch } = useAdminListVouchers();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof voucherSchema>>({
    resolver: zodResolver(voucherSchema),
    defaultValues: {
      code: "",
      coinValue: 50,
      maxUses: 100,
    },
  });

  const createMutation = useAdminCreateVoucher({
    mutation: {
      onSuccess: () => {
        toast({ title: "Voucher Created", description: "The voucher code is now active." });
        setIsDialogOpen(false);
        form.reset();
        refetch();
      },
      onError: (err) => {
        toast({ title: "Error", description: err.error || "Failed to create voucher", variant: "destructive" });
      }
    }
  });

  if (user && !user.isAdmin) {
    setLocation("/dashboard");
    return null;
  }

  const onSubmit = (values: z.infer<typeof voucherSchema>) => {
    createMutation.mutate({ data: values });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied", description: "Voucher code copied to clipboard" });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-7xl mx-auto"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary flex items-center gap-2">
              <Ticket className="h-6 w-6 text-primary" /> PROMO VOUCHERS
            </h1>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> NEW VOUCHER
            </Button>
          </DialogTrigger>
          <DialogContent className="border-primary/30 bg-card/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="font-bold text-xl text-primary">CREATE PROMO CODE</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Voucher Code</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., WELCOME2025" {...field} className="bg-background/50 font-mono uppercase" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="coinValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Coin Value</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="bg-background/50 font-mono" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxUses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Max Redemptions</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="bg-background/50 font-mono" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full font-mono bg-primary hover:bg-primary/90 text-primary-foreground mt-4" disabled={createMutation.isPending}>
                  ACTIVATE VOUCHER
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-background/50">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="font-mono text-xs font-bold uppercase pl-6">Code</TableHead>
                    <TableHead className="font-mono text-xs font-bold uppercase">Value</TableHead>
                    <TableHead className="font-mono text-xs font-bold uppercase">Usage</TableHead>
                    <TableHead className="font-mono text-xs font-bold uppercase">Status</TableHead>
                    <TableHead className="font-mono text-xs font-bold uppercase">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vouchers && vouchers.length > 0 ? vouchers.map((v) => {
                    const isExhausted = v.usedCount >= v.maxUses;
                    const isExpired = v.expiresAt && new Date(v.expiresAt) < new Date();
                    const isActive = !isExhausted && !isExpired;

                    return (
                      <TableRow key={v.id} className="border-border/50 hover:bg-white/5 transition-colors">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-2">
                            <code className="font-bold text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                              {v.code}
                            </code>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(v.code)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-secondary font-mono font-bold">
                            <Coins className="h-3 w-3" /> {v.coinValue}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-xs">
                            <span className="text-foreground">{v.usedCount}</span>
                            <span className="text-muted-foreground"> / {v.maxUses}</span>
                          </div>
                          <div className="w-24 h-1 bg-muted mt-1 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${isExhausted ? 'bg-destructive' : 'bg-primary'}`} 
                              style={{ width: `${Math.min(100, (v.usedCount / v.maxUses) * 100)}%` }}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          {isActive ? (
                            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 font-mono text-[10px]">
                              ACTIVE
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-mono text-[10px]">
                              {isExhausted ? 'EXHAUSTED' : 'EXPIRED'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {format(new Date(v.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground font-mono">
                        No vouchers found. Create one to reward your users.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
