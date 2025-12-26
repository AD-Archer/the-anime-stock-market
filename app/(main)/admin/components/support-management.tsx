"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function SupportManagement() {
  const {
    supportTickets,
    getSupportTickets,
    updateSupportTicket,
    currentUser,
  } = useStore();
  const [selected, setSelected] = useState<any | null>(null);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState<"open" | "in_progress" | "closed">(
    "open"
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

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

  const openTicket = (t: any) => {
    setSelected(t);
    setTimeout(() => setStatus(t.status), 0);
  };

  const handleSave = async () => {
    if (!selected) return;
    const messages = selected.messages ? [...selected.messages] : [];
    if (reply.trim()) {
      messages.push({
        senderId: currentUser?.id,
        text: reply.trim(),
        createdAt: new Date(),
      });
    }
    await updateSupportTicket(selected.id, {
      status,
      messages,
      assignedTo: currentUser?.id,
    });
    await getSupportTickets({
      status: statusFilter === "all" ? undefined : statusFilter,
      searchQuery: searchQuery || undefined,
    });
    setSelected(null);
    setReply("");
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[180px]">
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
            <CardContent className="py-8 flex items-center justify-center">
              <p className="text-muted-foreground">Loading tickets...</p>
            </CardContent>
          </Card>
        ) : supportTickets.length === 0 ? (
          <Card>
            <CardContent className="py-8 flex items-center justify-center">
              <p className="text-muted-foreground">No support tickets match the filters.</p>
            </CardContent>
          </Card>
        ) : (
          supportTickets.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span>{t.subject}</span>
                    <Badge
                      variant={
                        t.status === "open"
                          ? "default"
                          : t.status === "in_progress"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {t.status}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(t.createdAt).toLocaleString()}
                  </span>
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {t.contactEmail || t.userId || "Anonymous"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {t.message}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openTicket(t)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Support Ticket</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{selected.subject}</h3>
                <p className="text-sm text-muted-foreground">
                  {selected.email || selected.userId || "Anonymous"} •{" "}
                  {new Date(selected.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Conversation</h4>
                <div className="space-y-2">
                  <div className="rounded border p-3 bg-muted/40">
                    <p className="text-sm whitespace-pre-wrap">
                      {selected.message}
                    </p>
                  </div>
                  {(selected.messages || []).map((m: any, i: number) => (
                    <div key={i} className="rounded border p-3">
                      <div className="text-xs text-muted-foreground mb-1">
                        {m.senderId || "User"} •{" "}
                        {new Date(m.createdAt).toLocaleString()}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as any)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue>{status}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">open</SelectItem>
                    <SelectItem value="in_progress">in_progress</SelectItem>
                    <SelectItem value="closed">closed</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Write a reply..."
                  value={reply}
                  onChange={(e: any) => setReply(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button variant="secondary" onClick={() => setSelected(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
