"use client";

import { useState, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useStore } from "@/lib/store";

export function SupportForm() {
  const { currentUser, submitSupportTicket } = useStore();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState(currentUser?.email ?? "");
  const [tag, setTag] =
    useState<import("@/lib/types").SupportTicketTag>("other");
  const [referenceId, setReferenceId] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");

  const canSubmit =
    subject.trim().length > 0 &&
    message.trim().length >= 20 &&
    status !== "submitting";

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStatus("submitting");
    try {
      await submitSupportTicket({
        subject: subject.trim(),
        message: message.trim(),
        contactEmail: contactEmail || undefined,
        tag,
        referenceId: referenceId || undefined,
      });
      setSubject("");
      setMessage("");
      setContactEmail(currentUser?.email ?? "");
      setTag("other");
      setReferenceId("");
      setStatus("success");
    } catch (error) {
      console.error("Failed to submit support ticket", error);
      setStatus("error");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Support</CardTitle>
        <CardDescription>
          Need help? Use this form to contact the admin team. For reporting a
          message, choose <strong>Report</strong> and provide the message ID.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <Input
              placeholder="Subject"
              value={subject}
              onChange={(e: any) => setSubject(e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Select onValueChange={(v) => setTag(v as any)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{tag}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Reference (optional, e.g., message ID)"
                value={referenceId}
                onChange={(e: any) => setReferenceId(e.target.value)}
              />

              <Input
                placeholder="Contact email (optional, we will reply here)"
                value={contactEmail}
                onChange={(e: any) => setContactEmail(e.target.value)}
              />
            </div>

            <Textarea
              className="min-h-[160px]"
              placeholder="Describe your issue (at least 20 characters)"
              value={message}
              onChange={(e: any) => setMessage(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button disabled={!canSubmit} onClick={handleSubmit}>
              {status === "submitting" ? "Submitting..." : "Send Message"}
            </Button>
            {status === "success" && (
              <p className="text-sm text-green-500">
                Support ticket submitted. We will reply by email.
              </p>
            )}
            {status === "error" && (
              <p className="text-sm text-destructive">
                Something went wrong. Please try again.
              </p>
            )}
            {message.trim() && message.trim().length < 20 && (
              <p className="text-sm text-muted-foreground">
                Please provide at least 20 characters of detail.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
