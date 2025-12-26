"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { generateCharacterSlug } from "@/lib/utils";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface CreateStockDialogProps {
  onClose: () => void;
}

type ImportMode = "manual" | "anilist";
type ImportType = "anime" | "character" | null;

export function CreateStockDialog({ onClose }: CreateStockDialogProps) {
  const { createStock, currentUser } = useStore();
  const { toast } = useToast();

  const [importMode, setImportMode] = useState<ImportMode>("anilist");
  const [isImporting, setIsImporting] = useState(false);
  const [importType, setImportType] = useState<ImportType>(null);
  const [anilistUrl, setAnilistUrl] = useState("");
  const [anilistId, setAnilistId] = useState<number | null>(null);
  const [rateLimit, setRateLimit] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    characterName: "",
    anime: "",
    description: "",
    currentPrice: "",
    totalShares: "",
    imageUrl: "",
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
      // Match anilist.co/anime/12345 or anilist.co/character/12345
      const match = url.match(/anilist\.co\/(anime|character)\/(\d+)/);
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

  const handleUrlChange = (url: string) => {
    setAnilistUrl(url);
    setImportError(null);

    const parsed = parseAnilistUrl(url);
    if (parsed) {
      setAnilistId(parsed.id);
      setImportType(parsed.type);
    } else {
      setAnilistId(null);
      setImportType(null);
    }
  };

  const handleImportFromAnilist = async () => {
    if (!anilistId || !importType) {
      setImportError(
        "Invalid AniList URL. Please use: anilist.co/anime/12345 or anilist.co/character/12345"
      );
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const params = new URLSearchParams();
      params.set("type", importType);
      params.set("id", String(anilistId));
      params.set("userId", currentUser?.id || "");

      const response = await fetch(
        `/api/admin/add-stocks?${params.toString()}`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok) {
        setImportError(data.error || "Failed to import from AniList");
        toast({
          title: "Import Failed",
          description: data.error || "Failed to import from AniList",
          variant: "destructive",
        });
      } else {
        setRateLimit(data.rateLimit);
        setImportResult(data.result);
        toast({
          title: "Import Successful",
          description: `Added ${
            data.result.added || data.result.totalAdded || 0
          } stocks`,
        });
      }
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

    if (isNaN(shares) || shares <= 0) {
      toast({
        title: "Invalid Shares",
        description: "Please enter a valid number of shares greater than 0.",
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
        totalShares: "",
        imageUrl: "",
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
                <div className="grid grid-cols-2 gap-2 text-sm text-green-800">
                  {importResult.added !== undefined && (
                    <div>
                      New Stocks:{" "}
                      <span className="font-bold">{importResult.added}</span>
                    </div>
                  )}
                  {importResult.totalAdded !== undefined && (
                    <div>
                      Total Added:{" "}
                      <span className="font-bold">
                        {importResult.totalAdded}
                      </span>
                    </div>
                  )}
                  {importResult.updated !== undefined && (
                    <div>
                      Updated:{" "}
                      <span className="font-bold">{importResult.updated}</span>
                    </div>
                  )}
                  {importResult.failed !== undefined && (
                    <div>
                      Failed:{" "}
                      <span className="font-bold">{importResult.failed}</span>
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
                  <Label htmlFor="anilistUrl">AniList URL</Label>
                  <Input
                    id="anilistUrl"
                    value={anilistUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://anilist.co/anime/38000 or https://anilist.co/character/127303"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste an AniList anime or character URL
                  </p>
                </div>

                {anilistId && importType && (
                  <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-blue-900">
                          {importType === "anime" ? "Anime" : "Character"}{" "}
                          Detected
                        </p>
                        <p className="text-sm text-blue-800">ID: {anilistId}</p>
                      </div>
                      <Badge variant="default">Valid</Badge>
                    </div>
                  </div>
                )}

                {anilistUrl && !anilistId && (
                  <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <p className="text-sm text-red-800">
                        Invalid URL. Use: anilist.co/anime/ID or
                        anilist.co/character/ID
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleImportFromAnilist}
                  disabled={!anilistId || !importType}
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
