"use client";

import { useUser } from "@stackframe/stack";
import { useStore } from "@/lib/store";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { StockManagement } from "@/components/admin/stock-management";
import { UserManagement } from "@/components/admin/user-management";
import { CreateStockDialog } from "@/components/admin/create-stock-dialog";

export default function AdminPage() {
  const user = useUser({ or: "redirect" });
  const { currentUser } = useStore();
  const [showCreateStock, setShowCreateStock] = useState(false);

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

        <Tabs defaultValue="stocks" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="stocks">Stock Management</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
          </TabsList>
          <TabsContent value="stocks" className="mt-6">
            <StockManagement />
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </main>

      {showCreateStock && (
        <CreateStockDialog onClose={() => setShowCreateStock(false)} />
      )}
    </div>
  );
}
