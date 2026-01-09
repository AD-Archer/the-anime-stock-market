"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { awardRedeemValues } from "@/lib/award-definitions";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "welcome:join-popup-dismissed";
const SUPPRESSED_PATHS = ["/auth", "/jail"];

const isSuppressedPath = (pathname: string) =>
  SUPPRESSED_PATHS.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`)
  );

export function WelcomeJoinPopup() {
  const pathname = usePathname();
  const currentUser = useStore((state) => state.currentUser);
  const isLoading = useStore((state) => state.isLoading);
  const [open, setOpen] = useState(false);

  const suppressed = useMemo(() => isSuppressedPath(pathname), [pathname]);

  useEffect(() => {
    if (isLoading) return;
    if (currentUser) {
      setOpen(false);
      return;
    }
    if (suppressed) {
      setOpen(false);
      return;
    }
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) {
      setOpen(true);
    }
  }, [currentUser, isLoading, suppressed]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen && typeof window !== "undefined") {
      localStorage.setItem(DISMISS_KEY, "1");
    }
  };

  if (currentUser || isLoading || suppressed) {
    return null;
  }

  const welcomeBonusAmount = awardRedeemValues.welcome_bonus;

  if (!open) {
    return null;
  }

  return (
    <div className="border-b border-border bg-primary/10">
      <div className="container mx-auto flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Join now for your ${welcomeBonusAmount} welcome bonus
          </p>
          <p className="text-xs text-muted-foreground">
            Create a free account to get starter cash you can use on the market
            right away.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" asChild>
            <Link href="/auth/signup">Create free account</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/auth/signin">Sign in</Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
          >
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}
