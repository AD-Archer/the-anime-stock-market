"use client";

import { useState } from "react";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useStore } from "@/lib/store";
import type { SupportTicketTag } from "@/lib/types";
import { SUPPORT_TAG_LABELS, SUPPORT_TAGS } from "./support-tags";

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
  const tagLabel = SUPPORT_TAG_LABELS[tag] ?? tag;

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
          Need help? Use this form to contact the admin team. Choose{" "}
          <strong>Premium upgrade request</strong> to send a premium inquiry or{" "}
          <strong>Donation follow-up</strong> to share the name you used on your
          gift. When reporting a message, select <strong>Report</strong> and
          include the message ID.
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
              <Select
                onValueChange={(value) =>
                  setTag(value as SupportTicketTag)
                }
              >
                <SelectTrigger className="w-full" suppressHydrationWarning>
                  <SelectValue>{tagLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SUPPORT_TAGS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {SUPPORT_TAG_LABELS[option]}
                    </SelectItem>
                  ))}
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
            <div className="space-y-1 text-xs text-muted-foreground">
              {tag === "donation" && (
                <p>
                  After donating, share the name you selected so admins can match
                  the gift and unlock any promised perks.
                </p>
              )}
              {tag === "premium" && (
                <p>
                  Tell us why you&apos;re looking for premium access and what
                  you would like to do once it&apos;s active.
                </p>
              )}
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
