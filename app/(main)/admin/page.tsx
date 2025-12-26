"use client";

import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
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
import { ReportManagement } from "@/components/admin/report-management";
import { NotificationManagement } from "@/components/admin/notification-management";
import { SupportManagement } from "@/components/admin/support-management";
import { AppealManagement } from "@/components/admin/appeal-management";
import { AdminActionLogPanel } from "@/components/admin/admin-action-log";
import { CharacterSuggestions } from "@/components/admin/character-suggestions";
import dynamic from "next/dynamic";
const KillSwitchPanel = dynamic(
  () => import("@/components/admin/kill-switch").then((m) => m.KillSwitchPanel),
  { ssr: false }
);

// Danger extra can be client-side rendered directly
import { DangerZoneExtra } from "@/components/admin/danger-zone-extra";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentUser, isLoading: storeLoading } = useStore();
  const [showCreateStock, setShowCreateStock] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "stocks";

  useEffect(() => {
    if (!authLoading && !storeLoading && (!user || !currentUser?.isAdmin)) {
      router.push("/auth/signin");
    }
  }, [user, currentUser, authLoading, storeLoading, router]);

  if (authLoading || storeLoading || !user || !currentUser?.isAdmin) {
    return (
      <div
        className="container mx-auto px-4 py-8"
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-10 w-56 rounded-md bg-muted" />
            <div className="h-4 w-80 rounded-md bg-muted" />
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="space-y-3">
              <div className="h-5 w-40 rounded-md bg-muted" />
              <div className="h-9 w-full rounded-md bg-muted" />
              <div className="h-72 w-full rounded-md bg-muted" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <TabsList className="grid w-full max-w-5xl grid-cols-11 md:grid-cols-6 lg:grid-cols-11">
            <TabsTrigger value="stocks">Stocks</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="buybacks">Buybacks</TabsTrigger>
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appeals">Appeals</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="danger">Danger</TabsTrigger>
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
          <TabsContent value="reports" className="mt-6">
            <ReportManagement />
          </TabsContent>
          <TabsContent value="support" className="mt-6">
            <SupportManagement />
          </TabsContent>
          <TabsContent value="suggestions" className="mt-6">
            <CharacterSuggestions />
          </TabsContent>
          <TabsContent value="notifications" className="mt-6">
            <NotificationManagement />
          </TabsContent>
          <TabsContent value="appeals" className="mt-6">
            <AppealManagement />
          </TabsContent>
          <TabsContent value="logs" className="mt-6">
            <AdminActionLogPanel />
          </TabsContent>
          <TabsContent value="danger" className="mt-6">
            {/* Danger Zone: Kill Switch + destructive admin tools */}
            <div className="max-w-2xl space-y-6">
              {typeof window !== "undefined" && (
                <>
                  {/* @ts-ignore */}
                  <KillSwitchPanel />
                  {/* Dedupe tool */}
                  {/* @ts-ignore */}
                  <div className="pt-6">
                    {/* dynamic import not required for this small component */}
                    <DangerZoneExtra />
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {showCreateStock && (
        <CreateStockDialog onClose={() => setShowCreateStock(false)} />
      )}
    </div>
  );
}
