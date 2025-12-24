import { SupportForm } from "@/components/support/support-form";
import { SupportList } from "@/components/support/support-list";

export default function SupportPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Contact Support</h1>
      <p className="text-sm text-muted-foreground mb-6">
        If you&apos;re having trouble or need help, send a message to our support
        team. Please include as much detail as possible.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="max-w-2xl">
          <SupportForm />
        </div>
        <div>
          <SupportList />
        </div>
      </div>
    </main>
  );
}
