"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { account, ensureAppwriteInitialized } from "@/lib/appwrite/appwrite";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { awardService } from "@/lib/database/awardService";
import { useStore } from "@/lib/store";

export default function EmailVerificationCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      const userId = searchParams.get("userId");
      const secret = searchParams.get("secret");

      if (!userId || !secret) {
        setStatus("error");
        setMessage("Invalid verification link. Missing required parameters.");
        return;
      }

      const grantVerifiedAward = async () => {
        try {
          const existingAwards = await awardService.getByUserId(userId);
          const existingAward = existingAwards.find(
            (award) => award.type === "verified_account"
          );
          const award =
            existingAward ??
            (await awardService.create({
              userId,
              type: "verified_account",
              unlockedAt: new Date(),
              redeemed: false,
            }));
          useStore.setState((state) => {
            if (state.awards.some((a) => a.id === award.id)) {
              return state;
            }
            return { awards: [...state.awards, award] };
          });
        } catch (awardError) {
          console.warn("Failed to grant verified account award:", awardError);
        }
      };

      try {
        await ensureAppwriteInitialized();
        await account.updateVerification({ userId, secret });
        setStatus("success");
        setMessage("Your email has been verified successfully!");
        await grantVerifiedAward();
      } catch (error: any) {
        console.error("Email verification failed:", error);
        setStatus("error");

        const rawMessage = error?.message || "";
        if (rawMessage.includes("expired")) {
          setMessage(
            "This verification link has expired. Please request a new one."
          );
        } else if (rawMessage.includes("already")) {
          setStatus("success");
          setMessage("Your email is already verified.");
          await grantVerifiedAward();
        } else {
          setMessage(
            "Failed to verify email. Please try again or request a new link."
          );
        }
      }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-card border border-border rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <div>
              <h2 className="text-xl font-semibold">Verifying your email...</h2>
              <p className="text-muted-foreground mt-2">
                Please wait while we verify your email address.
              </p>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full w-fit mx-auto">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">
                Email Verified!
              </h2>
              <p className="text-muted-foreground mt-2">{message}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => router.push("/market")}>
                Go to Market
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/account/security")}
              >
                Account Settings
              </Button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full w-fit mx-auto">
              <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">
                Verification Failed
              </h2>
              <p className="text-muted-foreground mt-2">{message}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => router.push("/account/security")}>
                Request New Link
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/auth/signin")}
              >
                Sign In
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
