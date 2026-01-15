"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { userService } from "@/lib/database";
import { useStore } from "@/lib/store";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
  privacyLastUpdatedDisplay,
  termsLastUpdatedDisplay,
} from "@/lib/legal";

export function LegalUpdatePrompt() {
  const currentUser = useStore((state) => state.currentUser);
  const isLoading = useStore((state) => state.isLoading);
  const { toast } = useToast();
  const [isAccepting, setIsAccepting] = useState(false);
  const promptToastRef = useRef<ReturnType<typeof toast> | null>(null);
  const lastPromptKeyRef = useRef<string | null>(null);

  const needsTermsUpdate = Boolean(
    currentUser && currentUser.termsAcceptedVersion !== TERMS_VERSION
  );
  const needsPrivacyUpdate = Boolean(
    currentUser && currentUser.privacyAcceptedVersion !== PRIVACY_VERSION
  );

  const promptKeyParts: string[] = [];
  if (needsTermsUpdate) promptKeyParts.push(`terms:${TERMS_VERSION}`);
  if (needsPrivacyUpdate) promptKeyParts.push(`privacy:${PRIVACY_VERSION}`);
  const promptKey = promptKeyParts.length ? promptKeyParts.join("|") : null;

  const handleAccept = useCallback(async () => {
    if (!currentUser || isAccepting) return;
    if (!needsTermsUpdate && !needsPrivacyUpdate) return;
    setIsAccepting(true);
    const payload: Record<string, unknown> = {};
    if (needsTermsUpdate) {
      payload.termsAcceptedVersion = TERMS_VERSION;
      payload.termsAcceptedAt = new Date();
    }
    if (needsPrivacyUpdate) {
      payload.privacyAcceptedVersion = PRIVACY_VERSION;
      payload.privacyAcceptedAt = new Date();
    }

    try {
      const updatedUser = await userService.update(currentUser.id, payload);
      useStore.setState((state) => ({
        currentUser: updatedUser,
        users: state.users.map((user) =>
          user.id === updatedUser.id ? updatedUser : user
        ),
      }));
      toast({
        title: "Thanks!",
        description: "Your acceptance has been recorded.",
      });
    } catch (error) {
      console.error("Failed to record legal acceptance", error);
      toast({
        title: "Could not accept changes",
        description: "Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setIsAccepting(false);
    }
  }, [
    currentUser,
    needsPrivacyUpdate,
    needsTermsUpdate,
    isAccepting,
    toast,
  ]);

  useEffect(() => {
    if (!currentUser || isLoading) {
      lastPromptKeyRef.current = null;
      promptToastRef.current?.dismiss();
      promptToastRef.current = null;
      return;
    }

    if (!promptKey) {
      lastPromptKeyRef.current = null;
      promptToastRef.current?.dismiss();
      promptToastRef.current = null;
      return;
    }

    if (lastPromptKeyRef.current === promptKey) {
      return;
    }

    promptToastRef.current?.dismiss();

    promptToastRef.current = toast({
      title: "Terms of Service updated",
      description: (
        <span className="text-sm text-muted-foreground">
          {needsTermsUpdate && (
            <>
              Terms updated {termsLastUpdatedDisplay}. {" "}
              <Link href="/terms" className="text-primary hover:underline">
                Read the Terms
              </Link>
              {needsPrivacyUpdate ? " " : "."}
            </>
          )}
          {needsPrivacyUpdate && (
            <>
              Privacy updated {privacyLastUpdatedDisplay}. {" "}
              <Link
                href="/privacy"
                className="text-primary hover:underline"
              >
                Read the Privacy Policy
              </Link>
              .
            </>
          )}
        </span>
      ),
      action: (
        <ToastAction
          altText="Accept the latest Terms of Service and Privacy Policy"
          onClick={handleAccept}
        >
          Accept
        </ToastAction>
      ),
    });

    lastPromptKeyRef.current = promptKey;
  }, [
    currentUser,
    isLoading,
    promptKey,
    needsTermsUpdate,
    needsPrivacyUpdate,
    handleAccept,
    toast,
    termsLastUpdatedDisplay,
    privacyLastUpdatedDisplay,
  ]);

  return null;
}
