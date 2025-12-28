"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Heart, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PREMIUM_TIERS } from "@/lib/premium";
import { useStore } from "@/lib/store";

export default function DonatePage() {
  const { submitSupportTicket, currentUser } = useStore();
  const [isKoFiDialogOpen, setIsKoFiDialogOpen] = useState(false);
  const [isDonationDialogOpen, setIsDonationDialogOpen] = useState(false);
  const [donationName, setDonationName] = useState("");
  const [donationNotes, setDonationNotes] = useState("");
  const [donationStatus, setDonationStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");

  const handleDonationPing = async () => {
    if (!donationName.trim() || donationStatus === "submitting") return;

    setDonationStatus("submitting");
    try {
      const accountDetails = currentUser
        ? `Account username: ${currentUser.username}\nAccount email: ${currentUser.email}\n`
        : "";
      const baseMessage = `${accountDetails}Donated with the name "${donationName.trim()}". Please ping the admin to confirm the gift.`;
      const message = donationNotes.trim()
        ? `${baseMessage}\n\nNotes: ${donationNotes.trim()}`
        : baseMessage;
      await submitSupportTicket({
        subject: "Donation follow-up",
        message,
        tag: "donation",
      });
      setDonationStatus("success");
      setDonationName("");
      setDonationNotes("");
    } catch (error) {
      console.error("Failed to notify admin about donation", error);
      setDonationStatus("error");
    }
  };

  const canSubmitDonationPing =
    donationName.trim().length > 0 && donationStatus !== "submitting";

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Support the Anime Stock Market</CardTitle>
          <CardDescription>
            Help keep the servers online and fund new features.
          </CardDescription>
          <p className="text-xs text-purple-600 font-medium">
            <strong>Note:</strong> Premium access is permanent — it does not
            expire.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your donations cover hosting costs and help us build premium
            features for the community.
          </p>
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground space-y-3">
            <p className="font-semibold text-foreground flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Match your Anime Stock Market account
            </p>
            {currentUser ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Use the same email on Ko-fi and include your username in the
                  message so we can upgrade your tier.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="donate-username">Username</Label>
                    <Input
                      id="donate-username"
                      value={currentUser.username}
                      readOnly
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="donate-email">Email</Label>
                    <Input
                      id="donate-email"
                      value={currentUser.email}
                      readOnly
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Suggested Ko-fi message:{" "}
                  <span className="font-mono">{`username:${currentUser.username}`}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Used a different name or email? Please open a support ticket
                  so we can reconcile it.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sign in to see your username and email. Make sure your Ko-fi
                email matches your account and include your username in the
                message.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <Dialog open={isKoFiDialogOpen} onOpenChange={setIsKoFiDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="lg"
                  className="flex-1 h-16 flex items-center justify-center gap-2"
                  aria-label="Support on Ko-fi"
                >
                  <Heart className="h-5 w-5 text-pink-600" />
                  Support on Ko-fi
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Support the Anime Stock Market</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Use the same email as your account and add{" "}
                  <span className="font-mono">
                    {currentUser
                      ? `username:${currentUser.username}`
                      : "username:yourname"}
                  </span>{" "}
                  to the Ko-fi message so we can upgrade your tier.
                </p>
                <div className="mt-4">
                  <iframe
                    id="kofiframe"
                    src="https://ko-fi.com/ad_archer/?hidefeed=true&widget=true&embed=true&preview=true"
                    title="ad_archer"
                    loading="lazy"
                    height="600"
                    className="w-full rounded-lg bg-card border"
                    style={{ border: "none" }}
                  />
                </div>
              </DialogContent>
            </Dialog>
            <Link href="/premium" className="flex-1">
              <Button variant="outline" size="lg" className="w-full h-16">
                Access Premium Features
              </Button>
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <Dialog
              open={isDonationDialogOpen}
              onOpenChange={(open) => {
                if (!open) {
                  setDonationStatus("idle");
                }
                setIsDonationDialogOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-left whitespace-normal"
                >
                  If you donated, click here and enter the name you selected to
                  use when donating so we can ping the admin without leaving
                  this page.
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Donation follow-up</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    Share the Ko-fi name you used when donating so we can
                    reconcile it manually.
                  </p>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Ko-fi display name"
                    value={donationName}
                    onChange={(event) => setDonationName(event.target.value)}
                    autoFocus
                  />
                  <Textarea
                    placeholder="Additional notes (optional)"
                    value={donationNotes}
                    onChange={(event) => setDonationNotes(event.target.value)}
                    rows={3}
                  />
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {donationStatus === "success" && (
                      <span className="text-sm text-green-500">
                        Admin pinged successfully.
                      </span>
                    )}
                    {donationStatus === "error" && (
                      <span className="text-sm text-destructive">
                        Something went wrong. Please try again.
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDonationDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDonationPing}
                      disabled={!canSubmitDonationPing}
                    >
                      {donationStatus === "submitting"
                        ? "Notifying…"
                        : "Notify admin"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Link href="/support">
              <Button variant="ghost" size="sm">
                Used a different name or email?
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Premium tiers</CardTitle>
          <CardDescription>
            Matching donation amounts unlock the corresponding tier rewards and
            daily character limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {PREMIUM_TIERS.map((tier) => (
              <div
                key={tier.level}
                className="rounded-lg border border-border p-4 space-y-1"
              >
                <p className="text-xs text-muted-foreground">
                  Tier {tier.level}
                </p>
                <p className="text-lg font-semibold">{tier.label}</p>
                <p className="text-sm">
                  {tier.characterLimit} characters/day and ${tier.reward}{" "}
                  reward.
                </p>
                <p className="text-xs text-muted-foreground">
                  Donate ${tier.donationRequirement} to enter this tier.
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Each anime or manga character addition consumes 25 characters from
            your daily quota. Duplicate characters are not counted
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
