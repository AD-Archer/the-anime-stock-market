import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp, Users, BarChart3, Shield, Zap, Star } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="bg-background">
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
              <div className="text-4xl md:text-5xl font-bold mb-2">10,000+</div>
              <div className="text-lg opacity-90">Active Traders</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">500+</div>
              <div className="text-lg opacity-90">Anime Characters</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">$1M+</div>
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
    </div>
  );
}
