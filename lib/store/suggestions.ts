import type { StoreApi } from "zustand";
import { characterSuggestionService } from "../database";
import type { CharacterSuggestion } from "../types";
import type { StoreState } from "./types";

type StoreMutators = Pick<StoreApi<StoreState>, "setState" | "getState">;

const parseAniListUrl = (
  url?: string
): { id: number; type: "anime" | "character" } | null => {
  if (!url) return null;
  const match = url.match(/anilist\.co\/(anime|character)\/(\d+)/i);
  if (!match) return null;
  const id = Number.parseInt(match[2], 10);
  if (Number.isNaN(id)) return null;
  return { id, type: match[1] as "anime" | "character" };
};

export function createSuggestionActions({
  setState,
  getState,
}: StoreMutators) {
  const submitCharacterSuggestion = async (input: {
    characterName: string;
    anime: string;
    description?: string;
    anilistUrl?: string;
    anilistCharacterId?: number;
  }): Promise<CharacterSuggestion | null> => {
    const currentUser = getState().currentUser;
    if (!currentUser) {
      throw new Error("You must be signed in to suggest a character.");
    }

    const parsed = parseAniListUrl(input.anilistUrl);
    const hasLink = Boolean(parsed);
    const hasBasicInfo =
      Boolean(input.characterName?.trim()) && Boolean(input.anime?.trim());

    if (!hasLink && !hasBasicInfo) {
      throw new Error(
        "Please enter a character name and anime, or provide an AniList link."
      );
    }

    const resolvedCharacterId =
      input.anilistCharacterId ??
      (parsed?.type === "character" ? parsed.id : undefined);
    if (resolvedCharacterId) {
      const existing = getState().stocks.find(
        (s) => s.anilistCharacterId === resolvedCharacterId
      );
      if (existing) {
        throw new Error(
          `${existing.characterName} already exists in the market.`
        );
      }
      const existingSuggestion = getState().characterSuggestions.find(
        (s) => s.anilistCharacterId === resolvedCharacterId
      );
      if (existingSuggestion) {
        throw new Error(
          "A suggestion for this character already exists. Thanks for your enthusiasm!"
        );
      }
    }

    const fallbackName =
      input.characterName?.trim() ||
      (parsed ? `AniList ${parsed.type} ${parsed.id}` : "Unknown character");
    const fallbackAnime =
      input.anime?.trim() ||
      (parsed?.type === "anime"
        ? `AniList anime ${parsed.id}`
        : "Unknown anime");

    const payload: Omit<CharacterSuggestion, "id" | "createdAt" | "reviewedAt"> =
      {
        userId: currentUser.id,
        characterName: fallbackName,
        anime: fallbackAnime,
        description: input.description?.trim(),
        anilistUrl: input.anilistUrl?.trim(),
        anilistCharacterId: resolvedCharacterId,
        status: "pending",
        reviewedBy: undefined,
        resolutionNotes: undefined,
        stockId: undefined,
        autoImportStatus: input.anilistUrl ? "not_requested" : "not_requested",
        autoImportMessage: undefined,
      };

    const created = await characterSuggestionService.create(payload as any);
    setState((state) => ({
      characterSuggestions: [created, ...state.characterSuggestions],
    }));
    return created as CharacterSuggestion;
  };

  const getCharacterSuggestions = async (filters?: {
    status?: CharacterSuggestion["status"] | "all";
  }): Promise<CharacterSuggestion[]> => {
    const suggestions = await characterSuggestionService.list(filters);
    setState({ characterSuggestions: suggestions });
    return suggestions as CharacterSuggestion[];
  };

  const reviewCharacterSuggestion = async (
    suggestionId: string,
    status: CharacterSuggestion["status"],
    options?: {
      notes?: string;
      stockId?: string;
      autoImportStatus?: CharacterSuggestion["autoImportStatus"];
      autoImportMessage?: string;
    }
  ): Promise<CharacterSuggestion | null> => {
    const currentUser = getState().currentUser;
    if (!currentUser?.isAdmin) {
      throw new Error("Only admins can review character suggestions.");
    }

    const updates: Partial<CharacterSuggestion> = {
      status,
      reviewedAt: new Date(),
      reviewedBy: currentUser.id,
      resolutionNotes: options?.notes,
      stockId: options?.stockId,
      autoImportStatus: options?.autoImportStatus,
      autoImportMessage: options?.autoImportMessage,
    };

    const updated = await characterSuggestionService.update(
      suggestionId,
      updates
    );
    setState((state) => ({
      characterSuggestions: state.characterSuggestions.map((s) =>
        s.id === suggestionId ? updated : s
      ),
    }));

    if (updated.userId) {
      const title =
        status === "approved"
          ? "Character suggestion approved"
          : "Character suggestion decision";
      const defaultMessage =
        status === "approved"
          ? `Your ${updated.characterName} suggestion was approved.${
              updated.autoImportStatus === "succeeded" ? " It has been added to the market." : ""
            }`
          : `Your ${updated.characterName} suggestion was not approved.`;
      const message =
        status === "approved" && options?.autoImportMessage
          ? `${defaultMessage} ${options.autoImportMessage}`
          : options?.autoImportMessage || defaultMessage;
      getState().sendNotification(
        updated.userId,
        "character_suggestion",
        title,
        message,
        {
          suggestionId: updated.id,
          status,
          stockId: updated.stockId,
        }
      );
    }

    return updated as CharacterSuggestion;
  };

  return {
    submitCharacterSuggestion,
    getCharacterSuggestions,
    reviewCharacterSuggestion,
  };
}
