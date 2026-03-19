"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Loader2, Send, UserX, RotateCcw, Eye } from "lucide-react";

type EmailTemplate =
  | "trade_confirmation"
  | "weekly_performance"
  | "weekly_return"
  | "custom";

const TEMPLATE_OPTIONS: { value: EmailTemplate; label: string }[] = [
  { value: "trade_confirmation", label: "Trade Confirmation" },
  { value: "weekly_performance", label: "Weekly Performance Digest" },
  { value: "weekly_return", label: "Weekly Return Reminder" },
  { value: "custom", label: "Custom" },
];

function buildLocalPreview(
  template: EmailTemplate,
  username: string,
  customHtml: string
) {
  const demoCardUrl = `/api/email/performance-card?demo=1&name=${encodeURIComponent(
    username || "Trader"
  )}`;

  if (template === "custom") {
    return customHtml || `<p>Hi ${username},</p><p>Your custom email preview.</p>`;
  }

  if (template === "trade_confirmation") {
    return `
<p>Hi ${username},</p>
<p>Your buy order was executed successfully.</p>
<p style="margin:0 0 12px">
  <span style="display:inline-block;padding:10px 14px;background:#0f172a;color:#e2e8f0;border-radius:999px;font-size:12px">
    Character Snapshot
  </span>
</p>
<div style="max-width:320px;height:180px;border-radius:12px;background:linear-gradient(135deg,#1d4ed8,#0f172a);display:flex;align-items:flex-end;padding:14px;color:#fff;font-weight:700">
  Demo Character
</div>
<ul>
  <li><strong>Stock:</strong> Demo Character</li>
  <li><strong>Shares:</strong> 25</li>
  <li><strong>Price per share:</strong> $8.40</li>
  <li><strong>Total spent:</strong> $210.00</li>
</ul>
    `.trim();
  }

  if (template === "weekly_performance") {
    return `
<p>Hi ${username},</p>
<p>Here is your weekly Anime Stock Market performance digest.</p>
<p>
  <img
    src="${demoCardUrl}"
    alt="Weekly performance card preview"
    width="640"
    style="display:block;width:100%;max-width:640px;height:auto;border:0;border-radius:14px"
  />
</p>
<p><strong>Portfolio value:</strong> $12,430.12 (+$422.10 / +3.51%)</p>
<ul>
  <li><strong>Asuka Langley:</strong> +$210.00</li>
  <li><strong>Lelouch Lamperouge:</strong> +$122.10</li>
  <li><strong>Spike Spiegel:</strong> +$90.00</li>
</ul>
    `.trim();
  }

  return `
<p>Hi ${username},</p>
<p>The market has moved this week and your portfolio is waiting.</p>
<p>
  <img
    src="${demoCardUrl}"
    alt="Weekly return preview card"
    width="640"
    style="display:block;width:100%;max-width:640px;height:auto;border:0;border-radius:14px"
  />
</p>
<p>Check your holdings and discover trending stocks.</p>
  `.trim();
}

export function EmailManagement() {
  const { users, currentUser } = useStore();
  const { toast } = useToast();
  const [targetUserId, setTargetUserId] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [template, setTemplate] = useState<EmailTemplate>("trade_confirmation");
  const [subject, setSubject] = useState("");
  const [customHtml, setCustomHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingPrefs, setUpdatingPrefs] = useState(false);
  const [lastPreviewHtml, setLastPreviewHtml] = useState<string>("");
  const [preferenceScope, setPreferenceScope] = useState<"single" | "all">(
    "single"
  );

  const selectedUser = useMemo(
    () => users.find((u) => u.id === targetUserId) || null,
    [users, targetUserId]
  );

  const typedRecipientName = useMemo(() => {
    const email = targetEmail.trim();
    if (!email) return "";
    const localPart = email.split("@")[0] || "Trader";
    const cleaned = localPart.replace(/[._-]+/g, " ").trim();
    return cleaned || "Trader";
  }, [targetEmail]);

  const resolvedPreviewName = useMemo(() => {
    if (typedRecipientName) return typedRecipientName;
    return selectedUser?.displayName || selectedUser?.username || "Trader";
  }, [typedRecipientName, selectedUser]);

  const previewHtml = useMemo(() => {
    return buildLocalPreview(template, resolvedPreviewName, customHtml);
  }, [template, resolvedPreviewName, customHtml]);

  const hasRecipient = targetUserId.trim().length > 0 || targetEmail.trim().length > 0;

  const sendTestEmail = async () => {
    if (!currentUser?.id) return;
    if (!hasRecipient) {
      toast({
        title: "Add a recipient",
        description: "Select a user or type an email address.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/admin/emails/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminUserId: currentUser.id,
          targetUserId,
          targetEmail,
          template,
          subject,
          html: customHtml,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to send test email");
      }

      setLastPreviewHtml(payload.previewHtml || previewHtml);
      toast({
        title: "Test email sent",
        description: `Sent ${payload.template || template} email to ${
          payload.recipientEmail || targetEmail || selectedUser?.email || "recipient"
        } via ${payload.deliveryMethod || "email"}.`,
      });
    } catch (error: any) {
      toast({
        title: "Send failed",
        description: error?.message || "Could not send test email.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const updatePreferences = async (action: "unsubscribe_all" | "enable_defaults") => {
    if (!currentUser?.id) return;
    if (preferenceScope === "single" && !targetUserId) return;

    if (preferenceScope === "all") {
      const confirmed = window.confirm(
        action === "unsubscribe_all"
          ? "Unsubscribe ALL users from all emails?"
          : "Restore default email settings for ALL users?"
      );
      if (!confirmed) return;
    }

    setUpdatingPrefs(true);
    try {
      const response = await fetch("/api/admin/emails/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminUserId: currentUser.id,
          action,
          ...(preferenceScope === "all"
            ? { applyToAll: true }
            : { targetUserId }),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to update user email preferences");
      }

      const updatedCount = Number(payload?.updatedCount ?? 0);
      toast({
        title:
          action === "unsubscribe_all"
            ? preferenceScope === "all"
              ? "Users unsubscribed"
              : "User unsubscribed"
            : "Email defaults restored",
        description:
          preferenceScope === "all"
            ? `${updatedCount} user${updatedCount === 1 ? "" : "s"} updated`
            : selectedUser?.email || targetUserId,
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message || "Could not update email preferences.",
        variant: "destructive",
      });
    } finally {
      setUpdatingPrefs(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Email Tools</h3>
        <p className="text-sm text-muted-foreground">
          Preview templates, send test emails, and manage unsubscribe actions.
        </p>
      </div>

      <Tabs defaultValue="test" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="test">
            <Mail className="h-4 w-4 mr-2" />
            Test + Preview
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <UserX className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Test Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Recipient</Label>
                <Select value={targetUserId} onValueChange={setTargetUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.username} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  Or type any email address for direct test sends.
                </p>
              </div>

              <div>
                <Label htmlFor="manual-email-recipient">Manual email address</Label>
                <Input
                  id="manual-email-recipient"
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <Label>Template</Label>
                <Select
                  value={template}
                  onValueChange={(value) => setTemplate(value as EmailTemplate)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {template === "custom" && (
                <>
                  <div>
                    <Label htmlFor="custom-email-subject">Subject</Label>
                    <Input
                      id="custom-email-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Custom subject"
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-email-html">HTML Content</Label>
                    <Textarea
                      id="custom-email-html"
                      value={customHtml}
                      onChange={(e) => setCustomHtml(e.target.value)}
                      rows={10}
                      placeholder="<p>Write custom HTML for preview and test send...</p>"
                    />
                  </div>
                </>
              )}

              <Button onClick={sendTestEmail} disabled={sending || !hasRecipient}>
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Test Email
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none dark:prose-invert rounded-lg border border-border p-4 bg-muted/20"
                dangerouslySetInnerHTML={{ __html: lastPreviewHtml || previewHtml }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Preference Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Scope</Label>
                <Select
                  value={preferenceScope}
                  onValueChange={(value) =>
                    setPreferenceScope(value as "single" | "all")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single user</SelectItem>
                    <SelectItem value="all">All users</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {preferenceScope === "single" ? (
                <div>
                  <Label>Target user</Label>
                  <Select value={targetUserId} onValueChange={setTargetUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.username} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Actions below will apply to every user account.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  disabled={
                    updatingPrefs ||
                    (preferenceScope === "single" && !targetUserId)
                  }
                  onClick={() => updatePreferences("unsubscribe_all")}
                >
                  {updatingPrefs ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserX className="h-4 w-4 mr-2" />
                  )}
                  {preferenceScope === "all"
                    ? "Unsubscribe All Users From All Emails"
                    : "Unsubscribe User From All Emails"}
                </Button>

                <Button
                  variant="outline"
                  disabled={
                    updatingPrefs ||
                    (preferenceScope === "single" && !targetUserId)
                  }
                  onClick={() => updatePreferences("enable_defaults")}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {preferenceScope === "all"
                    ? "Restore Default Email Settings For All Users"
                    : "Restore Default Email Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
