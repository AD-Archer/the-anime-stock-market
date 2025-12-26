"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TrendingUp,
  Users,
  BarChart3,
  Shield,
  Zap,
  Star,
  Search,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { BuyDialog } from "@/app/(main)/character/components/buy-dialog";
import { MarketOverview } from "@/components/market-overview";
import { SearchMarket } from "@/components/search-market";
import { useRouter } from "next/navigation";
import { formatCurrencyCompact } from "@/lib/utils";
import { stockService } from "@/lib/database";
import { TopStocksSection } from "./market/components/top-stocks-section";
import { metadataService } from "@/lib/database";

export default function LandingPage() {
  const { stocks, users, transactions, currentUser, isLoading } = useStore();
  const router = useRouter();
  const [stockCount, setStockCount] = useState<number>(0);
  const [isStockCountLoading, setIsStockCountLoading] = useState(true);
  const [userCount, setUserCount] = useState<number>(0);
  const [totalVolume, setTotalVolume] = useState<number>(0);
  const [isMetadataLoading, setIsMetadataLoading] = useState(true);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [count, usersTotal, volumeTotal] = await Promise.all([
          stockService.getCount(),
          metadataService.getUserCount(),
          metadataService.getTotalVolume(),
        ]);
        setStockCount(count);
        setUserCount(usersTotal);
        setTotalVolume(volumeTotal);
      } catch (error) {
        console.error("Failed to fetch metadata counts:", error);
        // Fallbacks if metadata fails
        setStockCount(stocks.length);
        setUserCount(users.length);
        setTotalVolume(
          transactions.reduce((sum, t) => sum + Math.abs(t.totalAmount || 0), 0)
        );
      } finally {
        setIsStockCountLoading(false);
        setIsMetadataLoading(false);
      }
    };

    fetchMetadata();
  }, [stocks.length, users.length, transactions.length, transactions]);

  // Only show stats when data is loaded
  const transactionVolume = transactions.reduce(
    (sum, t) => sum + Math.abs(t.totalAmount || 0),
    0
  );
  const activeTraders =
    isMetadataLoading && isLoading ? 0 : userCount || users.length;
  const animeCharacters =
    isStockCountLoading && isLoading ? 0 : stockCount || stocks.length;
  const totalVolumeDisplay =
    isMetadataLoading && isLoading ? 0 : totalVolume || transactionVolume;
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);

  const handleSelectStock = (stockId: string) => {
    if (!currentUser) {
      router.push("/auth/signin");
    } else {
      setSelectedStockId(stockId);
    }
  };
  return (
    <div className="bg-background overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Welcome to the{" "}
              <span className="text-primary">Anime Stock Market</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              A just-for-fun market game where anime characters become your
              portfolio. No real money, no offsite purchases, and no pay-to-win
              advantages.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/market">
                <Button size="lg" className="text-lg px-8 py-3">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Start Trading
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-3"
                >
                  <BarChart3 className="mr-2 h-5 w-5" />
                  View Leaderboard
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              This is a community game. All activity is simulated, accounts are
              protected with encrypted passwords, and chat/messages are built
              into the experience.
            </p>
          </div>
        </div>

        {/* Floating elements for visual appeal */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-primary/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-secondary/20 rounded-full blur-xl"></div>
      </section>

      {/* Live Characters Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Live Market - Most Active Characters
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Track the characters with the most trade activity right now, or
              search for your favorites.
            </p>
          </div>

          <div className="space-y-6 mb-8">
            <MarketOverview />

            <div className="w-full max-w-md mx-auto">
              <SearchMarket
                stocks={stocks}
                onSelectStock={(stock) => handleSelectStock(stock.id)}
              />
            </div>

            <TopStocksSection topStocks={stocks} onBuy={handleSelectStock} />
          </div>

          <div className="text-center mt-12">
            <Link href="/market">
              <Button size="lg" variant="outline" className="text-lg px-8 py-3">
                <TrendingUp className="mr-2 h-5 w-5" />
                View Full Market
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose Anime Stock Market?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience the thrill of trading in a universe where your favorite
              characters become your investments.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Play-Money Trading</CardTitle>
                <CardDescription>
                  Trade with simulated credits only. No real money and no
                  offsite purchases.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Community + Chat</CardTitle>
                <CardDescription>
                  Join anime fans, trade characters, and use built-in chat and
                  direct messages.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Advanced Analytics</CardTitle>
                <CardDescription>
                  Track performance with detailed charts, portfolio analysis,
                  and market insights.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Secure Platform</CardTitle>
                <CardDescription>
                  Passwords are encrypted, data is protected, and trading stays
                  fair with no paid advantages.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Zap className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Instant Transactions</CardTitle>
                <CardDescription>
                  Execute trades instantly with our lightning-fast transaction
                  processing system.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Star className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Built for Fun</CardTitle>
                <CardDescription>
                  A smooth experience focused on fun, transparency, and friendly
                  competition.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-3 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">
                {isLoading
                  ? "..."
                  : activeTraders > 0
                  ? `${activeTraders.toLocaleString()}+`
                  : "..."}
              </div>
              <div className="text-lg opacity-90">Active Traders</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">
                {isLoading
                  ? "..."
                  : animeCharacters > 0
                  ? `${animeCharacters.toLocaleString()}+`
                  : "..."}
              </div>
              <div className="text-lg opacity-90">Anime Characters</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">
                {isLoading
                  ? "..."
                  : totalVolumeDisplay > 0
                  ? `${formatCurrencyCompact(totalVolumeDisplay)}+`
                  : "..."}
              </div>
              <div className="text-lg opacity-90">Total Volume</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Jump In?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join the community of anime fans and compete for fun. No real money,
            no offsite purchases, and no unfair advantages.
          </p>
          <Link href="/market">
            <Button size="lg" className="text-lg px-8 py-3">
              <TrendingUp className="mr-2 h-5 w-5" />
              Enter the Market
            </Button>
          </Link>
        </div>
      </section>

      {selectedStockId && (
        <BuyDialog
          stockId={selectedStockId}
          onClose={() => setSelectedStockId(null)}
        />
      )}
    </div>
  );
}
