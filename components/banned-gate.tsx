"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

const ALLOWED_PATHS = ["/jail", "/market"];

const isPathAllowed = (pathname: string) =>
  ALLOWED_PATHS.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`)
  );

export function BannedGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useStore((state) => state.currentUser);

  const isBanned = useMemo(() => {
    if (!currentUser?.bannedUntil) return false;
    return currentUser.bannedUntil > new Date();
  }, [currentUser]);

  useEffect(() => {
    if (!isBanned) return;
    if (isPathAllowed(pathname)) return;
    router.replace("/jail");
  }, [isBanned, pathname, router]);

  if (isBanned && !isPathAllowed(pathname)) {
    return null;
  }

  return <>{children}</>;
}
