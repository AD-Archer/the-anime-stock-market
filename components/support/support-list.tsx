"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useStore } from "@/lib/store";
import type { SupportTicketTag } from "@/lib/types";
import { getUserProfileHref } from "@/lib/user-profile";
import {
  SUPPORT_FILTER_OPTIONS,
  SUPPORT_TAG_LABELS,
  SupportTagFilterValue,
} from "./support-tags";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
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
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
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
  const {
    currentUser,
    supportTickets,
    getSupportTickets,
    users,
  } = useStore();
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] =
    useState<SupportTagFilterValue>("all");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const filters: {
          status?: string;
          searchQuery?: string;
          tag?: SupportTicketTag;
        } = {};
        if (statusFilter !== "all") {
          filters.status = statusFilter;
        }
        if (searchQuery) {
          filters.searchQuery = searchQuery;
        }
        if (tagFilter !== "all") {
          filters.tag = tagFilter;
        }
        await getSupportTickets(filters);
      } finally {
        setLoading(false);
      }
    })();
  }, [getSupportTickets, statusFilter, searchQuery, tagFilter]);

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
  const premiumRequests = useMemo(
    () => myTickets.filter((t) => t.tag === "premium"),
    [myTickets]
  );
  const latestPremiumRequest = useMemo(
    () => premiumRequests[0],
    [premiumRequests]
  );

  const visibleTickets = useMemo(() => {
    if (currentUser?.isAdmin) {
      return supportTickets;
    }
    return myTickets;
  }, [supportTickets, myTickets, currentUser?.isAdmin]);

  const headingLabel = currentUser?.isAdmin
    ? "Support Tickets"
    : "My Support Tickets";

  if (!currentUser) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{headingLabel}</h3>
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
      <div className="flex flex-wrap gap-2">
        {SUPPORT_FILTER_OPTIONS.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={tagFilter === tab.value ? "secondary" : "outline"}
            onClick={() => setTagFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      {premiumRequests.length > 0 && latestPremiumRequest && (
        <Card className="border-l-4 border-primary/70 bg-primary/5">
          <CardContent className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Premium request recorded
            </p>
            <p className="text-xs text-muted-foreground">
              We have your premium request{premiumRequests.length > 1 ? "s" : ""} queued for review.
            </p>
            <p className="text-xs text-muted-foreground">
              Status: {latestPremiumRequest.status} • Submitted on{" "}
              {new Date(latestPremiumRequest.createdAt).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}
      {loading ? (
        <Card>
          <CardContent className="py-6">Loading...</CardContent>
        </Card>
      ) : visibleTickets.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            No support tickets match the selected filters.
          </CardContent>
        </Card>
      ) : (
        visibleTickets.map((t) => {
          const ticketUser = t.userId
            ? users.find((u) => u.id === t.userId)
            : undefined;
          const contactLabel =
            ticketUser?.email || t.contactEmail || "Anonymous";
          return (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t.subject}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(t.createdAt).toLocaleString()}
                  </span>
                </CardTitle>
                <CardDescription className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {ticketUser ? (
                      <Link
                        href={getUserProfileHref(ticketUser, ticketUser.id)}
                        className="hover:underline font-medium text-foreground"
                      >
                        {ticketUser.displayName || ticketUser.username}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">
                        {contactLabel}
                      </span>
                    )}
                    {ticketUser?.email && (
                      <span className="text-xs text-muted-foreground">
                        {ticketUser.email}
                      </span>
                    )}
                    {!ticketUser && t.contactEmail && (
                      <span className="text-xs text-muted-foreground">
                        {t.contactEmail}
                      </span>
                    )}
                    {t.tag && (
                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                        {SUPPORT_TAG_LABELS[t.tag]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Status: {t.status}</span>
                    <span>•</span>
                    <span>{new Date(t.createdAt).toLocaleString()}</span>
                  </div>
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
          );
        })
      )}
    </div>
  );
}
