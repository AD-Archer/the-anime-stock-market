"use client";

import { useEffect, useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function FollowUpForm({ ticketId }: { ticketId: string }) {
  const { addSupportFollowUp } = useStore();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSubmitting(true);
    try {
      await addSupportFollowUp(ticketId, message);
      setMessage("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-2">
      <Textarea
        value={message}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          setMessage(e.target.value)
        }
        placeholder="Type your follow-up message..."
        rows={3}
        disabled={isSubmitting}
      />
      <Button type="submit" disabled={isSubmitting || !message.trim()}>
        {isSubmitting ? "Sending..." : "Send Follow-up"}
      </Button>
    </form>
  );
}

export function SupportList() {
  const { currentUser, supportTickets, getSupportTickets } = useStore();
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const filters: { status?: string; searchQuery?: string } = {};
        if (statusFilter !== "all") {
          filters.status = statusFilter;
        }
        if (searchQuery) {
          filters.searchQuery = searchQuery;
        }
        await getSupportTickets(filters);
      } finally {
        setLoading(false);
      }
    })();
  }, [getSupportTickets, statusFilter, searchQuery]);

  const myTickets = useMemo(
    () =>
      supportTickets.filter(
        (t) =>
          t.userId === currentUser?.id ||
          t.contactEmail === currentUser?.email ||
          (t as any).email === currentUser?.email
      ),
    [supportTickets, currentUser]
  );

  if (!currentUser) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">My Support Tickets</h3>
      <div className="flex gap-2">
        <Input
          placeholder="Search tickets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" suppressHydrationWarning>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <Card>
          <CardContent className="py-6">Loading...</CardContent>
        </Card>
      ) : myTickets.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            You have not submitted any support tickets that match the filters.
          </CardContent>
        </Card>
      ) : (
        myTickets.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t.subject}</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(t.createdAt).toLocaleString()}
                </span>
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground flex items-center gap-2">
                <span>Status: {t.status}</span>
                {t.tag && (
                  <span className="ml-2 inline-flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs border border-border`}
                    >
                      {t.tag}
                    </span>
                  </span>
                )}
                {t.contactEmail && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {t.contactEmail}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{t.message}</p>
              {(t.messages || []).length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium">Conversation</h4>
                  <div className="space-y-2 mt-2">
                    {t.messages!.map((m, i) => (
                      <div key={i} className="rounded border p-3">
                        <div className="text-xs text-muted-foreground mb-1">
                          {m.senderId ||
                            t.contactEmail ||
                            (t as any).email ||
                            "User"}{" "}
                          • {new Date(m.createdAt).toLocaleString()}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <FollowUpForm ticketId={t.id} />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
