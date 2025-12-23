"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldOff } from "lucide-react";
import { useStore } from "@/lib/store";

export default function JailPage() {
  const currentUser = useStore((state) => state.currentUser);

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-col gap-2 items-center text-center">
          <ShieldOff className="h-10 w-10 text-destructive" />
          <CardTitle className="text-2xl text-foreground">Account Restricted</CardTitle>
          <p className="text-sm text-muted-foreground">
            {currentUser?.bannedUntil
              ? `Your account is banned until ${currentUser.bannedUntil.toLocaleString()}.`
              : "Your account is currently restricted."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            You can still browse the market but other areas are locked until the ban ends.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/market">
              <Button>Go to Market</Button>
            </Link>
            <Link href="/messages">
              <Button variant="outline">Contact Support</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
