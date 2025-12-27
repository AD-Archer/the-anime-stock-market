import type { SupportTicketTag } from "@/lib/types";

export const SUPPORT_TAG_LABELS: Record<SupportTicketTag, string> = {
  feature: "Feature request",
  bug: "Bug report",
  question: "Question",
  report: "Report",
  donation: "Donation follow-up",
  premium: "Premium upgrade request",
  other: "Other",
};

export const SUPPORT_TAGS: SupportTicketTag[] = [
  "feature",
  "bug",
  "question",
  "report",
  "donation",
  "premium",
  "other",
];

export type SupportTagFilterValue = SupportTicketTag | "all";

export const SUPPORT_FILTER_OPTIONS: {
  value: SupportTagFilterValue;
  label: string;
}[] = [
  { value: "all", label: "All tickets" },
  { value: "premium", label: "Premium requests" },
  { value: "donation", label: "Donations" },
  { value: "feature", label: "Feature requests" },
  { value: "bug", label: "Bug reports" },
  { value: "question", label: "Questions" },
  { value: "report", label: "Reports" },
  { value: "other", label: "Other" },
];
