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
import { TrendingUp, Users, BarChart3, Shield, Zap, Star, Search } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { StockCard } from "@/components/stock-card";
import { Input } from "@/components/ui/input";
import { BuyDialog } from "@/app/(main)/character/components/buy-dialog";
import { MarketOverview } from "@/components/market-overview";
import { useRouter } from "next/navigation";


export default function LandingPage() {
  const { stocks, users, transactions, currentUser } = useStore();
  const router = useRouter();

  const activeTraders = users.length;
  const animeCharacters = stocks.length;
  const totalVolume = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);

  // Sort stocks by market cap (price * total shares) descending
  const sortedStocks = [...stocks].sort((a, b) =>
    (b.currentPrice * b.totalShares) - (a.currentPrice * a.totalShares)
  );

  // Top 100 characters
  const top100Stocks = sortedStocks.slice(0, 100);

  // Filter stocks based on search query
  const filteredStocks = top100Stocks.filter(
    (stock) =>
      stock.characterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.anime.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <div className="bg-background overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Welcome to the{" "}
              <span className="text-primary">Anime Stock Exchange</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Trade your favorite anime characters like stocks. Invest in
              heroes, villains, and icons from the anime universe.
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
              Live Market - Top 100 Characters
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Explore the most valuable anime characters in real-time. Search and discover your favorites.
            </p>

          </div>

          <div className="space-y-6 mb-8">
            <MarketOverview />

            <div className="w-full max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search characters or anime..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {filteredStocks.map((stock) => (
                <StockCard
                  key={stock.id}
                  stock={stock}
                  onBuy={() => {
                    if (!currentUser) {
                      router.push('/auth/signin');
                    } else {
                      setSelectedStockId(stock.id);
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {filteredStocks.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                No characters found matching &quot;{searchQuery}&quot;
              </p>
            </div>
          )}

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
              Why Choose Anime Stock Exchange?
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
                <CardTitle>Real-time Trading</CardTitle>
                <CardDescription>
                  Buy and sell anime character stocks with live market data and
                  instant transactions.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Community Driven</CardTitle>
                <CardDescription>
                  Join thousands of anime fans trading characters and competing
                  on leaderboards.
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
                  Your investments are protected with enterprise-grade security
                  and fair trading practices.
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
                <CardTitle>Premium Experience</CardTitle>
                <CardDescription>
                  Enjoy a sleek, modern interface designed for the ultimate
                  trading experience.
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
              <div className="text-4xl md:text-5xl font-bold mb-2">{activeTraders.toLocaleString()}+</div>
              <div className="text-lg opacity-90">Active Traders</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">{animeCharacters.toLocaleString()}+</div>
              <div className="text-lg opacity-90">Anime Characters</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">${totalVolume.toLocaleString()}+</div>
              <div className="text-lg opacity-90">Total Volume</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Start Your Anime Investment Journey?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join the community of anime enthusiasts turning their passion into
            profits. Start trading today!
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
