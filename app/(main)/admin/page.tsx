"use client";

import { useUser } from "@stackframe/stack";
import { useStore } from "@/lib/store";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { StockManagement } from "@/components/admin/stock-management";
import { UserManagement } from "@/components/admin/user-management";
import { CreateStockDialog } from "@/components/admin/create-stock-dialog";
import { BuybackManagement } from "@/components/admin/buyback-management";
import { MarketManagement } from "@/components/admin/market-management";
import { NotificationManagement } from "@/components/admin/notification-management";

export default function AdminPage() {
  const user = useUser({ or: "redirect" });
  const { currentUser } = useStore();
  const [showCreateStock, setShowCreateStock] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "stocks";

  return (
    <div className="bg-background">
      {/* Header moved to app layout */}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-3xl font-bold text-foreground">Admin Panel</h2>
          <Button onClick={() => setShowCreateStock(true)}>
            Create New Stock
          </Button>
        </div>

        <Tabs
          defaultValue={tab}
          onValueChange={(value) => router.push(`/admin?tab=${value}`)}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="stocks">Stocks</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="buybacks">Buybacks</TabsTrigger>
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          <TabsContent value="stocks" className="mt-6">
            <StockManagement />
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <UserManagement />
          </TabsContent>
          <TabsContent value="buybacks" className="mt-6">
            <BuybackManagement />
          </TabsContent>
          <TabsContent value="market" className="mt-6">
            <MarketManagement />
          </TabsContent>
          <TabsContent value="notifications" className="mt-6">
            <NotificationManagement />
          </TabsContent>
        </Tabs>
      </main>

      {showCreateStock && (
        <CreateStockDialog onClose={() => setShowCreateStock(false)} />
      )}
    </div>
  );
}
