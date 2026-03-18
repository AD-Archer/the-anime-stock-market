import { SupportForm } from "@/components/support/support-form";
import { SupportList } from "@/components/support/support-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SupportPage() {
  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <section className="rounded-xl border bg-card/40 p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Support Center
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-3xl">
          Create new tickets, track active conversations, and follow up in one
          place. If you are signed in, you can always return here to continue an
          existing support thread.
        </p>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6 items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <SupportList />
            </CardContent>
          </Card>
        </div>

        <div className="xl:sticky xl:top-24 self-start">
          <SupportForm />
        </div>
      </div>
    </main>
  );
}
