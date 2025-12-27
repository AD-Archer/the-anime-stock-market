"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { generateCharacterSlug } from "@/lib/utils";
import type { MediaType } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface CreateStockDialogProps {
  onClose: () => void;
}

type ImportMode = "manual" | "anilist";
type ImportType = "anime" | "manga" | "character" | null;

export function CreateStockDialog({ onClose }: CreateStockDialogProps) {
  const { createStock, currentUser } = useStore();
  const { toast } = useToast();

  const [importMode, setImportMode] = useState<ImportMode>("anilist");
  const [isImporting, setIsImporting] = useState(false);
  const [importType, setImportType] = useState<ImportType>(null);
  const [anilistUrls, setAnilistUrls] = useState<string>("");
  const [parsedUrls, setParsedUrls] = useState<
    Array<{ id: number; type: ImportType; url: string; valid: boolean }>
  >([]);
  const [rateLimit, setRateLimit] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    characterName: "",
    anime: "",
    description: "",
    currentPrice: "",
    totalShares: "1500",
    imageUrl: "",
    mediaType: "anime",
  });

  // Prevent page unload during import
  useEffect(() => {
    if (isImporting) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "";
        return "";
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () =>
        window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, [isImporting]);

  const parseAnilistUrl = (
    url: string
  ): { id: number; type: ImportType } | null => {
    try {
      // Match anilist.co/anime/12345, anilist.co/manga/12345, or anilist.co/character/12345
      const match = url.match(/anilist\.co\/(anime|manga|character)\/(\d+)/);
      if (match) {
        return {
          id: parseInt(match[2]),
          type: match[1] as ImportType,
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const handleUrlsChange = (urlsText: string) => {
    setAnilistUrls(urlsText);
    setImportError(null);

    // Parse each line as a separate URL
    const urlLines = urlsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const parsed = urlLines.map((url) => {
      const parsedUrl = parseAnilistUrl(url);
      return {
        url,
        id: parsedUrl?.id || 0,
        type: parsedUrl?.type || null,
        valid: parsedUrl !== null,
      };
    });

    setParsedUrls(parsed);

    // Set import type based on first valid URL (for backward compatibility)
    const firstValid = parsed.find((p) => p.valid);
    if (firstValid) {
      setImportType(firstValid.type);
    } else {
      setImportType(null);
    }
  };

  const handleImportFromAnilist = async () => {
    const validUrls = parsedUrls.filter((p) => p.valid);

    if (validUrls.length === 0) {
      setImportError(
        "No valid AniList URLs found. Please enter URLs in the format: anilist.co/anime/12345 or anilist.co/character/12345"
      );
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const results = [];
      let totalAdded = 0;
      let rateLimitInfo = null;

      for (const urlData of validUrls) {
        const params = new URLSearchParams();
        params.set("type", urlData.type!);
        params.set("id", String(urlData.id));
        params.set("userId", currentUser?.id || "");

        const response = await fetch(
          `/api/admin/add-stocks?${params.toString()}`,
          { method: "POST" }
        );

        const data = await response.json();

        if (!response.ok) {
          // For multiple URLs, we'll collect errors but continue with others
          results.push({
            url: urlData.url,
            success: false,
            error: data.error || "Failed to import",
          });
        } else {
          results.push({
            url: urlData.url,
            success: true,
            result: data.result,
          });
          totalAdded += data.result.added || data.result.totalAdded || 0;
          if (data.rateLimit) {
            rateLimitInfo = data.rateLimit;
          }
        }
      }

      setRateLimit(rateLimitInfo);
      setImportResult({
        results,
        totalAdded,
        totalProcessed: validUrls.length,
      });

      const successCount = results.filter((r) => r.success).length;
      toast({
        title: "Import Completed",
        description: `Successfully imported ${successCount}/${validUrls.length} URLs (${totalAdded} stocks added)`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setImportError(errorMsg);
      toast({
        title: "Import Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualSubmit = async () => {
    if (
      !formData.characterName ||
      !formData.anime ||
      !formData.description ||
      !formData.currentPrice ||
      !formData.totalShares
    ) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const price = Number.parseFloat(formData.currentPrice);
    const shares = Number.parseInt(formData.totalShares);

    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(shares) || shares < 1500) {
      toast({
        title: "Invalid Shares",
        description: "Please enter a valid number of shares (minimum 1500).",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create stocks.",
        variant: "destructive",
      });
      return;
    }

    // Generate slug from character name
    const slug = generateCharacterSlug(formData.characterName);

    try {
      setIsImporting(true);
      await createStock({
        characterName: formData.characterName,
        characterSlug: slug,
        anime: formData.anime,
        description: formData.description,
        currentPrice: price,
        totalShares: shares,
        availableShares: shares,
        mediaType: formData.mediaType as MediaType,
        imageUrl: formData.imageUrl || "/placeholder.svg?height=400&width=400",
        createdBy: currentUser.id,
        anilistCharacterId: 0,
        anilistMediaIds: [],
      });

      toast({
        title: "Stock Created",
        description: `${formData.characterName} has been added to the market.`,
      });

      setFormData({
        characterName: "",
        anime: "",
        description: "",
        currentPrice: "",
        totalShares: "1500",
        imageUrl: "",
        mediaType: "anime",
      });

      setManualError(null); // Clear any previous errors
      onClose();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to create stock:", error);
      setManualError(errorMsg);
      toast({
        title: "Error Creating Stock",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open onOpenChange={isImporting ? undefined : onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto px-4 sm:px-6">
        <DialogHeader>
          <DialogTitle>
            {isImporting ? "Importing Stocks..." : "Create New Stock"}
          </DialogTitle>
          <DialogDescription>
            {isImporting
              ? "Please wait while we import stocks from AniList. Do not close this dialog or navigate away."
              : "Add a new anime character stock manually or import from AniList."}
          </DialogDescription>
        </DialogHeader>

        {isImporting ? (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Processing your import request...
            </p>
            {rateLimit && (
              <div className="rounded-lg bg-slate-100 p-4">
                <p className="mb-2 text-xs font-semibold">
                  Rate Limit: {rateLimit.requestsUsed}/
                  {rateLimit.totalRequestsAllowed}
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-300">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${
                        (rateLimit.requestsUsed /
                          rateLimit.totalRequestsAllowed) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Requests remaining: {rateLimit.requestsRemaining}
                </p>
              </div>
            )}
            {importResult && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="font-semibold text-green-900">
                    Import Complete!
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm text-green-800">
                    <div>
                      URLs Processed:{" "}
                      <span className="font-bold">
                        {importResult.totalProcessed}
                      </span>
                    </div>
                    <div>
                      Total Stocks Added:{" "}
                      <span className="font-bold">
                        {importResult.totalAdded}
                      </span>
                    </div>
                  </div>

                  {importResult.results && importResult.results.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-green-900 mb-2">
                        Details:
                      </p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {importResult.results.map(
                          (result: any, index: number) => (
                            <div key={index} className="text-xs">
                              <span
                                className={`font-medium ${
                                  result.success
                                    ? "text-green-700"
                                    : "text-red-700"
                                }`}
                              >
                                {result.success ? "✓" : "✗"}
                              </span>
                              <span className="ml-1 text-green-800 truncate inline-block max-w-full">
                                {result.url}
                              </span>
                              {result.success && result.result && (
                                <span className="ml-1 text-green-600">
                                  (+
                                  {result.result.added ||
                                    result.result.totalAdded ||
                                    0}
                                  )
                                </span>
                              )}
                              {!result.success && (
                                <span className="ml-1 text-red-600">
                                  {result.error}
                                </span>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {importError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="font-semibold text-red-900">Import Failed</p>
                </div>
                <p className="text-sm text-red-800">{importError}</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Tab Selection */}
            <div className="flex gap-2 border-b mb-4 -mx-4 sm:mx-0 px-4 sm:px-0">
              <button
                onClick={() => {
                  setImportMode("anilist");
                  setManualError(null);
                }}
                className={`pb-2 px-4 font-medium ${
                  importMode === "anilist"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Import from AniList
              </button>
              <button
                onClick={() => {
                  setImportMode("manual");
                  setImportError(null);
                }}
                className={`pb-2 px-4 font-medium ${
                  importMode === "manual"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Manual Entry
              </button>
            </div>

            {/* AniList Import Mode */}
            {importMode === "anilist" && (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="anilistUrls">
                    AniList URLs (one per line)
                  </Label>
                  <Textarea
                    id="anilistUrls"
                    value={anilistUrls}
                    onChange={(e) => handleUrlsChange(e.target.value)}
                    placeholder="https://anilist.co/anime/38000&#10;https://anilist.co/manga/30002&#10;https://anilist.co/character/127303&#10;https://anilist.co/anime/16498"
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter one AniList URL per line. Supports anime, manga, and
                    character URLs.
                  </p>
                </div>

                {parsedUrls.length > 0 && (
                  <div className="space-y-2">
                    <Label>
                      URL Validation ({parsedUrls.filter((p) => p.valid).length}
                      /{parsedUrls.length} valid)
                    </Label>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {parsedUrls.map((parsed, index) => (
                        <div
                          key={index}
                          className={`rounded-lg p-3 border ${
                            parsed.valid
                              ? "bg-green-50 border-green-200"
                              : "bg-red-50 border-red-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-mono truncate ${
                                  parsed.valid
                                    ? "text-green-800"
                                    : "text-red-800"
                                }`}
                              >
                                {parsed.url}
                              </p>
                              {parsed.valid && (
                                <p className="text-xs text-green-700">
                                  {parsed.type === "anime"
                                    ? "Anime"
                                    : parsed.type === "manga"
                                    ? "Manga"
                                    : "Character"}{" "}
                                  ID: {parsed.id}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant={parsed.valid ? "default" : "destructive"}
                            >
                              {parsed.valid ? "Valid" : "Invalid"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleImportFromAnilist}
                  disabled={parsedUrls.filter((p) => p.valid).length === 0}
                  className="w-full"
                  size="lg"
                >
                  Import from AniList
                </Button>
              </div>
            )}

            {/* Manual Entry Mode */}
            {importMode === "manual" && (
              <div className="grid gap-4 py-4">
                {manualError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <p className="font-semibold text-red-900">
                        Creation Failed
                      </p>
                    </div>
                    <p className="text-sm text-red-800">{manualError}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="characterName">Character Name *</Label>
                    <Input
                      id="characterName"
                      value={formData.characterName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          characterName: e.target.value,
                        })
                      }
                      placeholder="e.g., Luffy"
                      required
                      />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="anime">Anime *</Label>
                    <Input
                      id="anime"
                      value={formData.anime}
                      onChange={(e) =>
                        setFormData({ ...formData, anime: e.target.value })
                      }
                      placeholder="e.g., One Piece"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mediaType">Media Type</Label>
                    <Select
                      value={formData.mediaType}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          mediaType: value as MediaType,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anime">Anime</SelectItem>
                        <SelectItem value="manga">Manga</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Brief description of the character..."
                    rows={2}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPrice">Initial Price ($) *</Label>
                    <Input
                      id="currentPrice"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.currentPrice}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentPrice: e.target.value,
                        })
                      }
                      placeholder="1.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalShares">Total Shares *</Label>
                    <Input
                      id="totalShares"
                      type="number"
                      min="1"
                      value={formData.totalShares}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          totalShares: e.target.value,
                        })
                      }
                      placeholder="10000"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL (optional)</Label>
                  <Input
                    id="imageUrl"
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, imageUrl: e.target.value })
                    }
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use a placeholder image
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isImporting}>
            {isImporting ? "Importing..." : "Cancel"}
          </Button>
          {!isImporting && importMode === "manual" && (
            <Button onClick={handleManualSubmit}>Create Stock</Button>
          )}
          {!isImporting && importMode === "anilist" && importResult && (
            <Button onClick={onClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
