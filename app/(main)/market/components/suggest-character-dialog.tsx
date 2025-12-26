"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";

interface SuggestCharacterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCharacterName?: string;
  defaultAnime?: string;
}

export function SuggestCharacterDialog({
  open,
  onOpenChange,
  defaultCharacterName,
  defaultAnime,
}: SuggestCharacterDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { submitCharacterSuggestion, currentUser, stocks } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    characterName: defaultCharacterName || "",
    anime: defaultAnime || "",
    description: "",
    anilistUrl: "",
  });

  const parsedAniList = useMemo(() => {
    const match = formData.anilistUrl.match(
      /anilist\.co\/(anime|character)\/(\d+)/i
    );
    if (!match) return null;
    const id = Number.parseInt(match[2], 10);
    if (Number.isNaN(id)) return null;
    return { id, type: match[1] as "anime" | "character" };
  }, [formData.anilistUrl]);

  const existingStock =
    parsedAniList?.type === "character"
      ? stocks.find((s) => s.anilistCharacterId === parsedAniList.id)
      : null;

  useEffect(() => {
    if (open) {
      setFormData((prev) => ({
        ...prev,
        characterName: defaultCharacterName || prev.characterName,
        anime: defaultAnime || prev.anime,
      }));
    }
  }, [open, defaultCharacterName, defaultAnime]);

  const handleSubmit = async () => {
    if (!currentUser) {
      toast({
        title: "Sign in required",
        description: "Create an account to suggest characters and get updates.",
        variant: "destructive",
      });
      router.push("/auth/signin");
      return;
    }

    const hasBasicInfo =
      Boolean(formData.characterName.trim()) &&
      Boolean(formData.anime.trim());
    if (!hasBasicInfo && !parsedAniList) {
      toast({
        title: "Missing details",
        description:
          "Add a character name and anime, or paste a valid AniList link.",
        variant: "destructive",
      });
      return;
    }

    if (existingStock) {
      toast({
        title: "Already listed",
        description: `${existingStock.characterName} is already on the market.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await submitCharacterSuggestion({
        characterName: formData.characterName.trim(),
        anime: formData.anime.trim(),
        description: formData.description.trim() || undefined,
        anilistUrl: formData.anilistUrl.trim() || undefined,
      });
      toast({
        title: "Suggestion sent",
        description:
          "Thanks! Our admins will review it. You'll get a notification when they decide.",
      });
      onOpenChange(false);
      setFormData({
        characterName: defaultCharacterName || "",
        anime: defaultAnime || "",
        description: "",
        anilistUrl: "",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit suggestion.";
      toast({
        title: "Could not send suggestion",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !isSubmitting && onOpenChange(value)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suggest a character</DialogTitle>
          <DialogDescription>
            Tell us who you want to see next. Add an AniList link for faster automatic approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="suggest-character-name">Character Name</Label>
              <Input
                id="suggest-character-name"
                value={formData.characterName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    characterName: e.target.value,
                  }))
                }
                placeholder="e.g., Makima"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suggest-anime">Anime</Label>
              <Input
                id="suggest-anime"
                value={formData.anime}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, anime: e.target.value }))
                }
                placeholder="e.g., Chainsaw Man"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="suggest-description">Why this character?</Label>
            <Textarea
              id="suggest-description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Optional context or what makes them exciting to trade..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="suggest-anilist-url">AniList link (optional)</Label>
            <Input
              id="suggest-anilist-url"
              value={formData.anilistUrl}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, anilistUrl: e.target.value }))
              }
                placeholder="https://anilist.co/character/12345 or https://anilist.co/anime/67890"
              />
            <p className="text-xs text-muted-foreground">
              Adding a valid AniList URL lets us auto-approve and import the stock faster. If you provide a link, name/anime become optional.
            </p>
            {existingStock && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                We already list {existingStock.characterName}.{" "}
                <button
                  className="underline font-semibold"
                  onClick={() =>
                    router.push(`/character/${existingStock.characterSlug}`)
                  }
                >
                  View stock
                </button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send suggestion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
