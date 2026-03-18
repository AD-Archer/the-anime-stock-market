"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { AlertCircle, CheckCircle2, Clock, MessageSquare, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { SupportTicket, SupportTicketTag } from "@/lib/types";
import { getUserProfileHref } from "@/lib/user-profile";
import {
  SUPPORT_FILTER_OPTIONS,
  SUPPORT_TAG_LABELS,
  SUPPORT_TAGS,
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

function AdminTicketControls({
  ticket,
  onUpdate,
}: {
  ticket: SupportTicket;
  onUpdate: (updates: Partial<SupportTicket>) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTag, setSelectedTag] = useState<SupportTicketTag>(ticket.tag || "other");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleTagChange = async (newTag: SupportTicketTag) => {
    setSelectedTag(newTag);
    setIsUpdating(true);
    try {
      await onUpdate({ tag: newTag });
    } finally {
      setIsUpdating(false);
      setIsEditing(false);
    }
  };

  const handleClose = async () => {
    setIsUpdating(true);
    try {
      await onUpdate({ status: "closed" });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mt-6 pt-4 border-t space-y-3">
      {isEditing ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Select Category</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SUPPORT_TAGS.map((tag) => (
              <Button
                key={tag}
                size="sm"
                variant={selectedTag === tag ? "default" : "outline"}
                onClick={() => void handleTagChange(tag)}
                disabled={isUpdating}
                className="text-xs"
              >
                {SUPPORT_TAG_LABELS[tag]}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(false)}
            className="w-full text-xs"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            disabled={isUpdating}
            className="text-xs w-full"
          >
            Change Category
          </Button>

          {ticket.status !== "closed" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => void handleClose()}
              disabled={isUpdating}
              className="text-xs w-full"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Close Ticket
            </Button>
          )}

          {ticket.status === "closed" && (
            <Badge variant="secondary" className="text-xs w-full justify-center">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Closed
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

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
  const { currentUser, supportTickets, getSupportTickets, users } = useStore();
  const searchParams = useSearchParams();
  const selectedTicketId = searchParams.get("ticket");
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<SupportTagFilterValue>("all");

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
          (t as any).email === currentUser?.email,
      ),
    [supportTickets, currentUser],
  );
  const premiumRequests = useMemo(
    () => myTickets.filter((t) => t.tag === "premium"),
    [myTickets],
  );
  const latestPremiumRequest = useMemo(
    () => premiumRequests[0],
    [premiumRequests],
  );

  const visibleTickets = useMemo(() => {
    const scoped = currentUser?.isAdmin ? supportTickets : myTickets;
    return [...scoped].sort((a, b) => {
      if (selectedTicketId && a.id === selectedTicketId) return -1;
      if (selectedTicketId && b.id === selectedTicketId) return 1;
      const priority = (status: string) =>
        status === "open" ? 0 : status === "in_progress" ? 1 : 2;
      const statusDelta = priority(a.status) - priority(b.status);
      if (statusDelta !== 0) return statusDelta;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [supportTickets, myTickets, currentUser?.isAdmin, selectedTicketId]);

  const ticketSummary = useMemo(() => {
    return visibleTickets.reduce(
      (acc, ticket) => {
        acc.total += 1;
        if (ticket.status === "open") acc.open += 1;
        if (ticket.status === "in_progress") acc.inProgress += 1;
        if (ticket.status === "closed") acc.closed += 1;
        return acc;
      },
      { total: 0, open: 0, inProgress: 0, closed: 0 },
    );
  }, [visibleTickets]);

  const headingLabel = currentUser?.isAdmin
    ? "Support Tickets"
    : "My Support Tickets";

  if (!currentUser) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{headingLabel}</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">Total: {ticketSummary.total}</Badge>
          <Badge>Open: {ticketSummary.open}</Badge>
          <Badge variant="outline">
            In Progress: {ticketSummary.inProgress}
          </Badge>
          <Badge variant="outline">Closed: {ticketSummary.closed}</Badge>
        </div>
      </div>
      <div className="space-y-3">
        <Input
          placeholder="Search tickets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger suppressHydrationWarning>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tagFilter} onValueChange={(val) => setTagFilter(val as SupportTagFilterValue)}>
            <SelectTrigger suppressHydrationWarning>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORT_FILTER_OPTIONS.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {premiumRequests.length > 0 && latestPremiumRequest && (
        <Card className="border-l-4 border-primary/70 bg-primary/5">
          <CardContent className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Premium request recorded
            </p>
            <p className="text-xs text-muted-foreground">
              We have your premium request
              {premiumRequests.length > 1 ? "s" : ""} queued for review.
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
          const assignedAdmin = t.assignedTo
            ? users.find((u) => u.id === t.assignedTo)
            : undefined;
          const contactLabel =
            ticketUser?.email || t.contactEmail || "Anonymous";
          const isSelectedFromUrl = selectedTicketId === t.id;
          return (
            <Card
              key={t.id}
              className={`transition-all ${
                isSelectedFromUrl
                  ? "ring-2 ring-primary/40 shadow-md"
                  : ""
              } ${
                t.tag === "error"
                  ? "border-l-4 border-l-red-500"
                  : ""
              }`}
            >
              <CardHeader>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {t.tag === "error" && (
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        )}
                        <span className="truncate">{t.subject}</span>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(t.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {t.status === "open" && (
                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                          <Clock className="w-3 h-3 mr-1" />
                          Open
                        </Badge>
                      )}
                      {t.status === "in_progress" && (
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          In Progress
                        </Badge>
                      )}
                      {t.status === "closed" && (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Closed
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {ticketUser ? (
                      <Link
                        href={getUserProfileHref(ticketUser, ticketUser.id)}
                        className="hover:underline font-medium text-sm text-foreground"
                      >
                        {ticketUser.displayName || ticketUser.username}
                      </Link>
                    ) : (
                      <span className="font-medium text-sm text-foreground">
                        {contactLabel}
                      </span>
                    )}

                    {t.tag && (
                      <Badge variant="outline" className="text-xs">
                        {SUPPORT_TAG_LABELS[t.tag]}
                      </Badge>
                    )}

                    {assignedAdmin && (
                      <span className="text-xs text-muted-foreground">
                        • Assigned to{" "}
                        <span className="font-medium">
                          {assignedAdmin.displayName ||
                            assignedAdmin.username}
                        </span>
                      </span>
                    )}
                  </div>

                  {(t.messages || []).length > 0 && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {t.messages!.length} response{t.messages!.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap mb-3">{t.message}</p>
                {(t.messages || []).length > 0 && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <h4 className="text-sm font-semibold">
                      {t.messages!.length} {t.messages!.length === 1 ? "Reply" : "Replies"}
                    </h4>
                    <div className="space-y-2">
                      {t.messages!.map((m, i) => {
                        const sender = m.senderId
                          ? users.find((u) => u.id === m.senderId)
                          : undefined;
                        const isAdmin = sender?.isAdmin;
                        const senderName =
                          sender?.displayName ||
                          sender?.username ||
                          sender?.email ||
                          t.contactEmail ||
                          (t as any).email ||
                          "You";

                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex items-baseline gap-2">
                              <p className="text-sm font-semibold">{senderName}</p>
                              {isAdmin && (
                                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                  Support
                                </span>
                              )}
                              <p className="text-xs text-muted-foreground ml-auto">
                                {new Date(m.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <p className="text-sm text-foreground bg-muted/40 rounded p-3 whitespace-pre-wrap">
                              {m.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {currentUser?.isAdmin && (
                  <AdminTicketControls
                    ticket={t}
                    onUpdate={async (updates) => {
                      try {
                        const { updateSupportTicket } = useStore.getState();
                        await updateSupportTicket(t.id, updates);
                      } catch (error) {
                        console.error("Failed to update ticket:", error);
                      }
                    }}
                  />
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
