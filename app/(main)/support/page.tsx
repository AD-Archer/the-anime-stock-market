"use client";

import { SupportForm } from "@/components/support/support-form";
import { SupportList } from "@/components/support/support-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";

export default function SupportPage() {
  const { currentUser } = useStore();
  const isAdmin = currentUser?.isAdmin;

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <section className="rounded-xl border bg-gradient-to-br from-primary/5 via-card/40 to-secondary/5 p-8 md:p-12">
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            Support Center
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
            {isAdmin
              ? "Manage support tickets and respond to user inquiries. Track ticket status and provide assistance."
              : "Got a problem? We&apos;re here to help. Create a new ticket, track your conversations, and get responses from our team."}
          </p>
        </div>
      </section>

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Support Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <SupportList />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <SupportList />
              </CardContent>
            </Card>
          </div>

          <div className="lg:sticky lg:top-24 self-start">
            <SupportForm />
          </div>
        </div>
      )}

      <section className="mt-16 pt-12 border-t">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <h3 className="font-bold text-xl">Explore & Connect</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://github.com/AD-Archer/the-anime-stock-market"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <svg
                    className="w-5 h-5 text-foreground group-hover:text-primary transition-colors"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span className="font-medium">View on GitHub</span>
                </a>
              </li>
              <li>
                <a
                  href="https://antonioarcher.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <svg
                    className="w-5 h-5 text-foreground group-hover:text-primary transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  <span className="font-medium">Creator&apos;s Website</span>
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-xl">How to Get Help Faster</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                <span>Be specific about what you were doing when the issue occurred</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                <span>Include any error messages or screenshots</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                <span>Tell us your username so we can check your account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                <span className="font-medium">We typically respond within 24 hours</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
