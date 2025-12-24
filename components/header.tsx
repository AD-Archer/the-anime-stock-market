"use client";

import Link from "next/link";
import { TrendingUp, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { UserMenu } from "@/components/user-menu";

export function Header() {
  const { currentUser } = useStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              Anime Stock Exchange
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/market">
              <Button variant="ghost">Market</Button>
            </Link>
            <Link href="/portfolio">
              <Button variant="ghost">Portfolio</Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="ghost">Top 100</Button>
            </Link>
            <Link href="/anime">
              <Button variant="ghost">Anime</Button>
            </Link>
            {currentUser?.isAdmin && (
              <Link href="/admin">
                <Button variant="ghost">Admin</Button>
              </Link>
            )}
            <UserMenu />
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1">
              <span className="text-sm text-muted-foreground">Balance:</span>
              <span className="font-mono font-semibold text-foreground">
                ${currentUser?.balance.toFixed(2)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-border pt-4">
            <nav className="flex flex-col gap-2">
              <Link href="/market" onClick={() => setIsMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  Market
                </Button>
              </Link>
              <Link href="/portfolio" onClick={() => setIsMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  Portfolio
                </Button>
              </Link>
              <Link href="/leaderboard" onClick={() => setIsMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  Leaderboard
                </Button>
              </Link>
              <Link href="/anime" onClick={() => setIsMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  Anime
                </Button>
              </Link>
              {currentUser?.isAdmin && (
                <Link href="/admin" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    Admin
                  </Button>
                </Link>
              )}
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-center gap-2">
                  <UserMenu />
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
