"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useEffect, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { PremiumComments } from "@/app/(main)/premium/components/premium-comments";
import { useStore } from "@/lib/store";
import {
  DEFAULT_PREMIUM_META,
  getPremiumQuotaStatus,
  getTotalDonations,
  getTierForMeta,
} from "@/lib/premium";
import { MediaType, type Stock } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateCharacterSlug } from "@/lib/utils";
import { SearchMarket } from "@/components/search-market";
import { PageShellLoading } from "@/components/loading/page-shell";

type AniListImportItem = {
  added?: boolean;
  stock?: Partial<Stock>;
  id?: string;
  characterName?: string;
  characterSlug?: string;
  anime?: string;
  imageUrl?: string;
  mediaType?: MediaType;
};

const parseAniListUrl = (
  url?: string
): { id: number; type: "anime" | "manga" | "character" } | null => {
  if (!url) return null;
  const match = url.match(/anilist\.co\/(anime|manga|character)\/(\d+)/i);
  if (!match) return null;
  const id = Number.parseInt(match[2], 10);
  if (Number.isNaN(id)) return null;
  const type = match[1].toLowerCase();
  if (type === "manga") return { id, type: "manga" };
  if (type === "character") return { id, type: "character" };
  return { id, type: "anime" };
};

export default function PremiumPage() {
  const {
    currentUser,
    createStock,
    claimDailyReward,
    claimPremiumReward,
    getDailyRewardInfo,
    submitCharacterSuggestion,
    refreshStocks,
    incrementPremiumCharacterCount,
    addPremiumAdditions,
    stocks,
    dailyRewards,
    premiumAdditions,
  } = useStore();
  const isLoading = useStore((s) => s.isLoading);

  const router = useRouter();
  const { toast } = useToast();
  const [createForm, setCreateForm] = useState({
    name: "",
    anime: "",
    description: "",
    imageUrl: "",
    price: "1",
    totalShares: "1500",
    anilistUrl: "",
    mediaType: "anime" as MediaType,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [suggestForm, setSuggestForm] = useState({
    name: "",
    anime: "",
    description: "",
    anilistUrl: "",
    priority: false,
  });
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestFeedback, setSuggestFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [rewardFeedback, setRewardFeedback] = useState<string | null>(null);
  const [isClaimingTierReward, setIsClaimingTierReward] = useState(false);
  const [tierRewardFeedback, setTierRewardFeedback] = useState<string | null>(
    null
  );
  const [newlyAddedCharacters, setNewlyAddedCharacters] = useState<
    {
      id: string;
      characterSlug: string;
      characterName: string;
      anime: string;
      imageUrl: string;
    }[]
  >([]);
  const [anilistUrl, setAnilistUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const userCreatedCharacters = useMemo(() => {
    return [...stocks]
      .filter((s) => s.createdBy === currentUser?.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [stocks, currentUser?.id]);

  const recentPremiumAdditions = useMemo(() => {
    if (premiumAdditions.length > 0) {
      return premiumAdditions.slice(0, 5).map((addition) => ({
        id: addition.id,
        stockId: addition.stockId,
        characterSlug: addition.characterSlug,
        characterName: addition.characterName,
        anime: addition.anime,
        imageUrl: addition.imageUrl,
      }));
    }
    return userCreatedCharacters.slice(0, 5).map((stock) => ({
      id: stock.id,
      stockId: stock.id,
      characterSlug: stock.characterSlug,
      characterName: stock.characterName,
      anime: stock.anime,
      imageUrl: stock.imageUrl,
    }));
  }, [premiumAdditions, userCreatedCharacters]);

  // Set priority to true for premium users by default
  useEffect(() => {
    const meta = currentUser?.premiumMeta ?? DEFAULT_PREMIUM_META;
    const isPremium = Boolean(meta.isPremium);
    if (isPremium) {
      setSuggestForm((prev) => ({
        ...prev,
        priority: true,
      }));
    }
  }, [currentUser?.premiumMeta, currentUser?.id]);

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-10">
        <PageShellLoading titleWidth="w-48" subtitleWidth="w-72" />
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="container mx-auto px-4 py-10">
        <Card>
          <CardContent className="space-y-4 text-center">
            <CardTitle>Premium Experience</CardTitle>
            <CardDescription>
              Sign in to unlock premium features, including exclusive character
              creation, dedicated messaging, and faster approvals.
            </CardDescription>
            <div className="flex justify-center gap-3">
              <Link href="/auth/signin">
                <Button>Sign in</Button>
              </Link>
              <Link href="/donate">
                <Button variant="outline">Support / Donate</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const meta = currentUser.premiumMeta ?? DEFAULT_PREMIUM_META;
  const isPremium = Boolean(meta.isPremium);
  const quotaStatus = isPremium ? getPremiumQuotaStatus(meta) : null;
  const canAccessPremiumTools = Boolean(currentUser.isAdmin || isPremium);
  const priorityAvailable = canAccessPremiumTools;

  const handleImportFromAniList = async () => {
    const url = anilistUrl.trim();
    if (!url) {
      setImportError("Please provide an AniList URL.");
      return;
    }

    if (!canAccessPremiumTools) {
      setImportError("Upgrade to premium to add new characters.");
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const params = new URLSearchParams();
      const parsed = parseAniListUrl(url);
      if (!parsed) {
        throw new Error(
          "Invalid AniList URL. Please use a link to anime, manga, or character."
        );
      }

      params.set("type", parsed.type);
      params.set("id", String(parsed.id));
      params.set("userId", currentUser?.id || "");

      const response = await fetch(
        `/api/admin/add-stocks?${params.toString()}`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.includes("already exists")) {
          // This is a duplicate - don't count against quota
          toast({
            title: "Already on market",
            description:
              "This character is already on the market and won't count against your quota.",
          });
          setAnilistUrl("");
          return;
        }
        throw new Error(data.error || "Failed to import character.");
      }

      const result = data.result ?? {};
      const addedCount = Number(result.added ?? result.totalAdded ?? 0);
      const duplicateCount = Number(result.updated ?? result.totalUpdated ?? 0);
      const resultItems = (
        Array.isArray(result.results)
          ? result.results
          : Array.isArray(result.details)
          ? result.details
          : []
      ) as AniListImportItem[];
      const inferredMediaType: MediaType =
        parsed.type === "manga" ? "manga" : "anime";

      const isValidImportStock = (
        stock: Partial<Stock>
      ): stock is Partial<Stock> & {
        id: string;
        characterName: string;
        anime: string;
      } => Boolean(stock.id && stock.characterName && stock.anime);

      const addedEntries = resultItems
        .filter((item): item is AniListImportItem =>
          Boolean(item?.added && (item.stock || item.id))
        )
        .map((item) => (item.stock ?? item) as Partial<Stock>)
        .filter(isValidImportStock)
        .map((stock) => ({
          stockId: stock.id,
          characterName: stock.characterName,
          characterSlug:
            stock.characterSlug ?? generateCharacterSlug(stock.characterName),
          anime: stock.anime,
          imageUrl: stock.imageUrl || "/placeholder.svg",
          mediaType: stock.mediaType ?? inferredMediaType,
          status: "added" as const,
          source: "anilist" as const,
        }));

      if (
        isPremium &&
        incrementPremiumCharacterCount &&
        (addedCount || duplicateCount)
      ) {
        try {
          await incrementPremiumCharacterCount(
            currentUser.id,
            inferredMediaType,
            addedCount,
            duplicateCount
          );
        } catch (error) {
          console.error("Failed to update premium quota usage:", error);
        }
      }

      if (isPremium && addedEntries.length > 0) {
        try {
          await addPremiumAdditions(currentUser.id, addedEntries);
        } catch (error) {
          console.error("Failed to log premium additions:", error);
        }
      }

      if (addedEntries.length > 0) {
        setNewlyAddedCharacters((prev) => [
          ...addedEntries.map((entry) => ({
            id: entry.stockId,
            characterSlug: entry.characterSlug,
            characterName: entry.characterName,
            anime: entry.anime,
            imageUrl: entry.imageUrl,
          })),
          ...prev,
        ]);
      }

      if (refreshStocks && addedCount > 0) {
        await refreshStocks();
      }

      if (addedCount === 0) {
        toast({
          title: "No new characters",
          description:
            duplicateCount > 0
              ? `${duplicateCount} character(s) already exist on the market.`
              : "All characters from this import already exist on the market.",
        });
        setAnilistUrl("");
        return;
      }

      const duplicateSuffix =
        duplicateCount > 0 ? ` ${duplicateCount} duplicate(s) skipped.` : "";
      toast({
        title: "Character added!",
        description: `${addedCount} character(s) added successfully.${duplicateSuffix}`,
      });

      setAnilistUrl("");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setImportError(errorMsg);
      toast({
        title: "Import failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClaimDailyReward = async () => {
    if (!claimDailyReward) return;
    setIsClaimingReward(true);
    setRewardFeedback(null);
    try {
      const result = await claimDailyReward();
      if (result.success) {
        toast({
          title: "Daily Reward Claimed!",
          description: result.message,
        });
        setRewardFeedback(
          result.message ?? `Received $${result.amount?.toFixed?.(2) ?? ""}!`
        );
        return;
      }
      toast({
        title: "Daily Reward",
        description: result.message,
        variant: "destructive",
      });
      setRewardFeedback(result.message ?? "Unable to claim reward yet.");
    } finally {
      setIsClaimingReward(false);
    }
  };

  const handleClaimTierReward = async () => {
    if (!claimPremiumReward) return;
    setIsClaimingTierReward(true);
    setTierRewardFeedback(null);
    try {
      const result = await claimPremiumReward();
      if (result.success) {
        toast({
          title: "Premium reward claimed!",
          description: result.message,
        });
        setTierRewardFeedback(result.message);
        return;
      }
      toast({
        title: "Premium reward",
        description: result.message,
        variant: "destructive",
      });
      setTierRewardFeedback(result.message);
    } finally {
      setIsClaimingTierReward(false);
    }
  };

  const handleCreateCharacter = async () => {
    const name = createForm.name.trim();
    const anime = createForm.anime.trim();
    const imageUrl = createForm.imageUrl.trim();

    if (!name || !anime || !imageUrl) {
      setCreateFeedback({
        type: "error",
        message: "Character name, anime, and image are required.",
      });
      return;
    }

    if (!canAccessPremiumTools) {
      setCreateFeedback({
        type: "error",
        message: "Upgrade to premium to add new characters.",
      });
      return;
    }

    const duplicate = stocks.find(
      (stock) =>
        stock.characterName.toLowerCase() === name.toLowerCase() &&
        stock.anime.toLowerCase() === anime.toLowerCase()
    );

    if (duplicate) {
      setCreateFeedback({
        type: "error",
        message: `${duplicate.characterName} from ${duplicate.anime} already exists.`,
      });
      return;
    }

    const price = Math.max(0.05, Number(createForm.price) || 1);
    const shares = Math.max(
      1,
      Number.parseInt(createForm.totalShares, 10) || 1500
    );
    const parsed = parseAniListUrl(createForm.anilistUrl);
    const anilistCharacterId = parsed?.type === "character" ? parsed.id : 0;
    const anilistMediaIds =
      parsed?.type && parsed.type !== "character" ? [String(parsed.id)] : [];

    setIsCreating(true);
    setCreateFeedback(null);

    try {
      await createStock({
        characterName: name,
        characterSlug: generateCharacterSlug(name),
        anime,
        currentPrice: price,
        totalShares: shares,
        availableShares: shares,
        createdBy: currentUser.id,
        description: createForm.description.trim(),
        imageUrl,
        anilistCharacterId,
        anilistMediaIds,
        mediaType: createForm.mediaType,
        source: parsed ? "anilist" : "manual",
      });
      setCreateFeedback({
        type: "success",
        message: `${name} has been added to the market.`,
      });
      setCreateForm((prev) => ({
        name: "",
        anime: "",
        description: "",
        imageUrl: "",
        price: "1",
        totalShares: "1500",
        anilistUrl: "",
        mediaType: prev.mediaType,
      }));
    } catch (error) {
      setCreateFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create the character.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmitSuggestion = async () => {
    const name = suggestForm.name.trim();
    const anime = suggestForm.anime.trim();

    if (!name || !anime) {
      setSuggestFeedback({
        type: "error",
        message: "Please provide a character name and anime title.",
      });
      return;
    }

    setIsSuggesting(true);
    setSuggestFeedback(null);

    try {
      await submitCharacterSuggestion({
        characterName: name,
        anime,
        description: suggestForm.description.trim(),
        anilistUrl: suggestForm.anilistUrl.trim() || undefined,
        priority: priorityAvailable ? suggestForm.priority : false,
      });
      setSuggestFeedback({
        type: "success",
        message: "Suggestion submitted for review.",
      });
      setSuggestForm({
        name: "",
        anime: "",
        description: "",
        anilistUrl: "",
        priority: false,
      });
    } catch (error) {
      setSuggestFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to submit your suggestion.",
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleStockSelect = (stock: Stock) => {
    router.push(`/character/${stock.characterSlug}`);
  };

  const tier = getTierForMeta(meta);
  const totalDonated = getTotalDonations(meta);
  const now = new Date();
  const lastTierRewardClaim = meta.lastPremiumRewardClaim ?? null;
  let canClaimTierReward = Boolean(tier);
  let hoursUntilNextTierClaim = 0;
  if (lastTierRewardClaim) {
    const hoursSince =
      (now.getTime() - lastTierRewardClaim.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      canClaimTierReward = false;
      hoursUntilNextTierClaim = Math.max(0, 24 - hoursSince);
    }
  }
  const rewardInfo = getDailyRewardInfo();
  const dailyRewardRecord = dailyRewards.find(
    (reward) => reward.userId === currentUser?.id
  );
  const canClaimDaily = rewardInfo?.canClaim ?? false;
  const nextRewardAmount = rewardInfo?.nextRewardAmount ?? 0;
  const hoursUntilNextClaim = rewardInfo?.hoursUntilNextClaim ?? 0;
  const currentStreak =
    rewardInfo?.currentStreak ?? dailyRewardRecord?.currentStreak ?? 0;
  const lastClaimDate = currentUser?.lastDailyRewardClaim;
  const weeklyDays = Array.from({ length: 7 }, (_, index) => {
    const baseDate = lastClaimDate ? new Date(lastClaimDate) : new Date();
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() - index);
    return {
      date,
      claimed: index < currentStreak,
      label: date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    };
  });
  const canSubmitCreate =
    canAccessPremiumTools &&
    createForm.name.trim().length > 0 &&
    createForm.anime.trim().length > 0 &&
    createForm.imageUrl.trim().length > 0 &&
    !isCreating;
  const canSubmitSuggestion =
    suggestForm.name.trim().length > 0 &&
    suggestForm.anime.trim().length > 0 &&
    !isSuggesting;
  return (
    <main className="container mx-auto px-4 py-10 space-y-6">
      {isPremium ? (
        <>
          <Card>
            <CardContent className="space-y-4">
              <CardTitle>Premium Membership</CardTitle>
              <CardDescription>
                Premium members can add new characters with admin-level tools,
                automatic suggestions, and a direct line to the owners.
              </CardDescription>
              <p className="text-xs text-purple-600 font-medium">
                <strong>Note:</strong> Premium access is permanent — it does not
                expire.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border border-border">
                  <CardContent className="space-y-2">
                    <p className="text-xs text-muted-foreground">Membership</p>
                    <p className="text-lg font-bold">
                      {isPremium ? "Active" : "Inactive"}
                    </p>
                    <Link href="/donate">
                      <Button variant="ghost" className="w-full">
                        Donate / Upgrade
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
                <Card className="border border-border">
                  <CardContent className="space-y-2">
                    <p className="text-xs text-muted-foreground">Donation</p>
                    <p className="text-sm">
                      Every dollar improves the servers, Appwrite hosting, and
                      new features.
                    </p>
                    <Link href="/donate">
                      <Button className="w-full">See Donation Options</Button>
                    </Link>
                  </CardContent>
                </Card>
                <Card className="border border-border">
                  <CardContent className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Total donated
                    </p>
                    <p className="text-2xl font-semibold">
                      ${totalDonated.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Thank you for supporting the community.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <CardTitle>Tier rewards</CardTitle>
              {tier ? (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Highlight label="Tier" value={tier.label} />
                    <Highlight
                      label="Daily limit"
                      value={`${tier.characterLimit} characters`}
                    />
                    <Highlight
                      label="Claimable reward"
                      value={`$${tier.reward}`}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tier achieved by donating ${tier.donationRequirement} or
                    more.
                  </p>
                  <div className="space-y-2">
                    <Button
                      onClick={handleClaimTierReward}
                      disabled={!canClaimTierReward || isClaimingTierReward}
                      className="w-full"
                    >
                      {isClaimingTierReward
                        ? "Claiming…"
                        : canClaimTierReward
                        ? `Claim $${tier.reward.toFixed(2)}`
                        : `Next claim in ~${Math.ceil(
                            hoursUntilNextTierClaim
                          )}h`}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {lastTierRewardClaim
                        ? `Last claimed ${lastTierRewardClaim.toLocaleDateString()}.`
                        : "Claim your daily tier reward when available."}
                    </p>
                    {tierRewardFeedback && (
                      <p className="text-xs text-muted-foreground">
                        {tierRewardFeedback}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No tier assigned yet. Admins can update your donation record
                  to unlock a tier.
                </p>
              )}
              {quotaStatus && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Highlight
                    label="Current limit"
                    value={`${quotaStatus.totalLimit} characters/day`}
                  />
                  <Highlight
                    label="Amount claimed"
                    value={`${quotaStatus.totalUsed} characters`}
                  />
                  <Highlight
                    label="Amount left"
                    value={`${quotaStatus.totalRemaining} characters`}
                  />
                </div>
              )}
              {typeof meta.charactersDuplicateToday === "number" &&
                meta.charactersDuplicateToday > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Duplicates ignored today: {meta.charactersDuplicateToday}
                  </p>
                )}
              <p className="text-xs text-muted-foreground">
                Reminder: adding one anime or manga character consumes 25
                characters from your daily total limit.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Import from AniList */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Import from AniList</p>
                    <p className="text-xs text-muted-foreground">
                      Paste an AniList URL to add new anime and manga characters
                      to the market. Each character uses 25 slots from your
                      daily quota. Duplicates will not be counted.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="https://anilist.co/anime/12345 or character/12345"
                      value={anilistUrl}
                      onChange={(e) => setAnilistUrl(e.target.value)}
                      disabled={isImporting}
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste a URL from AniList (anime, manga, or character
                      pages)
                    </p>
                    <Button
                      onClick={handleImportFromAniList}
                      disabled={isImporting || !anilistUrl.trim()}
                      className="w-full"
                    >
                      {isImporting ? "Importing…" : "Add character"}
                    </Button>
                    {importError && (
                      <p className="text-xs text-destructive">{importError}</p>
                    )}
                  </div>

                  {newlyAddedCharacters.length > 0 && (
                    <div className="space-y-2 border-t border-border pt-4">
                      <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                        Characters added in this session (
                        {newlyAddedCharacters.length})
                      </p>
                      <div className="grid gap-2 max-h-64 overflow-y-auto">
                        {newlyAddedCharacters.map((character) => (
                          <Link
                            key={character.id}
                            href={`/character/${character.characterSlug}`}
                            className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 hover:bg-green-100 transition-colors dark:border-green-800/60 dark:bg-green-950/40 dark:hover:bg-green-900/50"
                          >
                            <Image
                              src={character.imageUrl}
                              alt={character.characterName}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {character.characterName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {character.anime}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Suggest characters */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Suggest a character</p>
                    <p className="text-xs text-muted-foreground">
                      Know a character that should be on the market? Submit a
                      suggestion for review.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Input
                      placeholder="Character name"
                      value={suggestForm.name}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setSuggestForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="Anime or manga"
                      value={suggestForm.anime}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setSuggestForm((prev) => ({
                          ...prev,
                          anime: event.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="AniList URL (optional)"
                      value={suggestForm.anilistUrl}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setSuggestForm((prev) => ({
                          ...prev,
                          anilistUrl: event.target.value,
                        }))
                      }
                    />
                    <Textarea
                      placeholder="Why should this character be added?"
                      value={suggestForm.description}
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                        setSuggestForm((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                      className="min-h-[120px]"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="priority-toggle"
                        checked={suggestForm.priority}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          priorityAvailable &&
                          setSuggestForm((prev) => ({
                            ...prev,
                            priority: event.target.checked,
                          }))
                        }
                        disabled={!priorityAvailable}
                        className="h-4 w-4 rounded border"
                      />
                      <label
                        htmlFor="priority-toggle"
                        className="text-sm font-medium"
                      >
                        Mark as priority
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {priorityAvailable
                        ? "Premium members' suggestions are marked as priority by default."
                        : "Upgrade to premium to mark suggestions as priority."}
                    </p>
                    <Button
                      onClick={handleSubmitSuggestion}
                      disabled={!canSubmitSuggestion}
                      className="w-full"
                    >
                      {isSuggesting ? "Submitting…" : "Submit suggestion"}
                    </Button>
                    {suggestFeedback && (
                      <p
                        className={`text-xs ${
                          suggestFeedback.type === "error"
                            ? "text-destructive"
                            : "text-green-500"
                        }`}
                      >
                        {suggestFeedback.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-6">
              <div className="space-y-3 border-t border-border pt-0">
                <p className="text-sm text-muted-foreground">
                  Your recent premium additions
                </p>
                <SearchMarket
                  stocks={stocks}
                  onSelectStock={handleStockSelect}
                />
                {recentPremiumAdditions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No recent additions available yet.
                  </p>
                ) : (
                  <div className="grid gap-2 max-h-64 overflow-y-auto">
                    {recentPremiumAdditions.map((addition) => (
                      <Link
                        key={addition.id}
                        href={`/character/${
                          addition.characterSlug || addition.stockId
                        }`}
                        className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent transition-colors"
                      >
                        <Image
                          src={addition.imageUrl}
                          alt={addition.characterName}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded object-cover"
                        />
                        <div>
                          <p className="text-sm font-medium">
                            {addition.characterName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {addition.anime}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Want to explore more?</span>
                  <Link href="/market" className="text-primary hover:underline">
                    Browse the market
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Premium-Only Chat */}
          <PremiumComments premiumOnly={true} />
        </>
      ) : (
        <Card>
          <CardContent className="space-y-4">
            <CardTitle>Not premium yet?</CardTitle>
            <CardDescription>
              Donations keep the lights on. Upgrade to access admin tools,
              create characters, and talk to the people building the world.
            </CardDescription>
            <div className="flex gap-3">
              <Link href="/donate">
                <Button>Donate / Upgrade</Button>
              </Link>
              <Link href="/messages">
                <Button variant="outline">Ask about premium</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function Highlight({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
