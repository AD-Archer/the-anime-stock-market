"use client";

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";
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

const MIN_MESSAGE_LENGTH = 20;
const TAG_DESCRIPTIONS: Record<SupportTicketTag, string> = {
  feature: "Suggest a new feature or improvement",
  bug: "Report a bug or unexpected behavior",
  question: "Ask a general question",
  report: "Report inappropriate content or behavior",
  donation: "Follow up about a donation or gift",
  premium: "Request or discuss premium access",
  error: "Report a technical error you encountered",
  other: "Something else",
};

export function SupportForm() {
  const { currentUser, submitSupportTicket } = useStore();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState(currentUser?.email ?? "");
  const [tag, setTag] = useState<SupportTicketTag | undefined>(undefined);
  const [referenceId, setReferenceId] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const messageLength = message.trim().length;
  const isMessageValid = messageLength >= MIN_MESSAGE_LENGTH;
  const isSubjectValid = subject.trim().length > 0;
  const isTagValid = !!tag;
  const canSubmit = isSubjectValid && isMessageValid && isTagValid && status !== "submitting";

  // Initialize contact email from current user only once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (currentUser?.email && !contactEmail) {
      setContactEmail(currentUser.email);
    }
  }, [currentUser?.email]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!tag) {
      newErrors.tag = "Please select a category";
    }

    if (!isSubjectValid) {
      newErrors.subject = "Subject is required";
    }

    if (!isMessageValid) {
      newErrors.message = `Please provide at least ${MIN_MESSAGE_LENGTH} characters (${messageLength}/${MIN_MESSAGE_LENGTH})`;
    }

    if (contactEmail && !isValidEmail(contactEmail)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

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
      setTag(undefined);
      setReferenceId("");
      setErrors({});
      setStatus("success");

      setTimeout(() => {
        setStatus("idle");
      }, 5000);
    } catch (error) {
      console.error("Failed to submit support ticket", error);
      setStatus("error");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Contact Support
        </CardTitle>
        <CardDescription>
          We typically respond within 24 hours. The more details you provide, the faster we can help.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="tag" className="text-sm font-medium flex items-center gap-2">
              Category <span className="text-red-500">*</span>
            </label>
            <Select value={tag} onValueChange={(value) => {
              setTag(value as SupportTicketTag);
              if (errors.tag) {
                const newErrors = { ...errors };
                delete newErrors.tag;
                setErrors(newErrors);
              }
            }}>
              <SelectTrigger id="tag" className={`w-full ${errors.tag ? "border-red-500" : ""}`} suppressHydrationWarning>
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                {SUPPORT_TAGS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {SUPPORT_TAG_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tag && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.tag}
              </p>
            )}
            {tag && !errors.tag && (
              <p className="text-xs text-muted-foreground">
                {TAG_DESCRIPTIONS[tag]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="subject" className="text-sm font-medium flex items-center gap-2">
              Subject <span className="text-red-500">*</span>
            </label>
            <Input
              id="subject"
              placeholder="e.g., Can't sell my stocks"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (errors.subject) {
                  const newErrors = { ...errors };
                  delete newErrors.subject;
                  setErrors(newErrors);
                }
              }}
              aria-invalid={!!errors.subject}
              aria-describedby={errors.subject ? "subject-error" : undefined}
              className={errors.subject ? "border-red-500" : ""}
            />
            {errors.subject && (
              <p id="subject-error" className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.subject}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium flex items-center justify-between">
              <span>Details <span className="text-red-500">*</span></span>
              <span className={`text-xs ${isMessageValid ? "text-green-500" : "text-muted-foreground"}`}>
                {messageLength}/{MIN_MESSAGE_LENGTH}
              </span>
            </label>
            <Textarea
              id="message"
              className={`min-h-[120px] resize-none ${errors.message ? "border-red-500" : ""}`}
              placeholder="What were you doing? What happened?"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (errors.message) {
                  const newErrors = { ...errors };
                  delete newErrors.message;
                  setErrors(newErrors);
                }
              }}
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? "message-error" : undefined}
            />
            {errors.message && (
              <p id="message-error" className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.message}
              </p>
            )}
            {!errors.message && messageLength > 0 && (
              <div className={`text-xs flex items-center gap-1 ${isMessageValid ? "text-green-500" : "text-muted-foreground"}`}>
                {isMessageValid && <CheckCircle2 className="w-3 h-3" />}
                {isMessageValid ? "Ready to submit!" : `${MIN_MESSAGE_LENGTH - messageLength} more characters.`}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email (optional)
            </label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={contactEmail}
              onChange={(e) => {
                setContactEmail(e.target.value);
                if (errors.email) {
                  const newErrors = { ...errors };
                  delete newErrors.email;
                  setErrors(newErrors);
                }
              }}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p id="email-error" className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="reference" className="text-sm font-medium">
              Reference ID (optional)
            </label>
            <Input
              id="reference"
              placeholder="e.g., message ID"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="lg"
            className="w-full"
          >
            {status === "submitting" && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            )}
            {status === "submitting" ? "Submitting..." : "Submit Ticket"}
          </Button>

          {status === "success" && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm p-2 bg-green-50 dark:bg-green-950 rounded">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Submitted! Check your email.</span>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm p-2 bg-red-50 dark:bg-red-950 rounded">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Failed to submit. Try again.</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
