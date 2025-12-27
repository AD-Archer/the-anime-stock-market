import { NextRequest, NextResponse } from "next/server";
import { databases } from "@/lib/appwrite/appwrite";
import { userService } from "@/lib/database";
import {
  addAnimeStocks,
  addMangaStocks,
  addCharacterStocks,
  searchAndAddCharacterStocks,
} from "@/lib/anilist/ingest-stocks";
import { getRateLimitStatus } from "@/lib/anilist/client";

/**
 * Admin endpoint to add stocks from AniList
 *
 * Query parameters:
 * - type: "anime" | "character" | "search" - Type of import
 * - id: number - AniList ID (for anime or character)
 * - search: string - Character name to search for
 * - characterNameFilter: string - Filter characters by name (anime only)
 * - minRole: "MAIN" | "SUPPORTING" | "BACKGROUND" - Minimum character role (anime only)
 * - userId: string - User ID to verify authorization (required)
 *
 * POST body: { } (empty)
 */
export async function POST(request: NextRequest) {
  try {
    // Get user ID from query parameters (passed from client where auth is verified)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Missing user ID" },
        { status: 401 }
      );
    }

    // Verify user exists
    let userDoc;
    try {
      userDoc = await userService.getById(userId);
    } catch (error) {
      console.error("Error fetching user:", error);
      return NextResponse.json(
        { error: "Unauthorized - User not found" },
        { status: 401 }
      );
    }

    // Check if user is admin or premium
    const isAdmin = userDoc?.isAdmin;
    const isPremium = userDoc?.premiumMeta?.isPremium;

    if (!isAdmin && !isPremium) {
      return NextResponse.json(
        {
          error:
            "Admin or premium access required - Your account does not have the necessary privileges",
        },
        { status: 403 }
      );
    }

    const type = searchParams.get("type");
    const id = searchParams.get("id");
    const search = searchParams.get("search");
    const characterNameFilter = searchParams.get("characterNameFilter");
    const minRole = searchParams.get("minRole") as
      | "MAIN"
      | "SUPPORTING"
      | "BACKGROUND"
      | null;

    // Validate request
    if (!type || !["anime", "manga", "character", "search"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid or missing type parameter" },
        { status: 400 }
      );
    }

    if (type !== "search" && !id) {
      return NextResponse.json(
        { error: "ID required for this operation" },
        { status: 400 }
      );
    }

    if (type === "search" && !search) {
      return NextResponse.json(
        { error: "Search query required for search operation" },
        { status: 400 }
      );
    }

    let result;

    const createdByRole = isAdmin
      ? isPremium
        ? "admin+premium"
        : "admin"
      : isPremium
      ? "premium"
      : "user";
    const logContext = {
      createdByRole,
      creationSource: "anilist",
    };

    if (type === "anime") {
      const mediaId = parseInt(id!, 10);
      if (isNaN(mediaId)) {
        return NextResponse.json(
          { error: "Invalid media ID" },
          { status: 400 }
        );
      }

      result = await addAnimeStocks(
        mediaId,
        userId,
        {
          characterNameFilter: characterNameFilter || undefined,
          minRoleImportance: minRole || undefined,
        },
        logContext
      );

      // Server-side log for import result
      console.log(
        `[admin/add-stocks] anime import by ${userId} for media ${mediaId}: added=${result.added}, updated=${result.updated}, failed=${result.failed}`
      );
    } else if (type === "manga") {
      const mediaId = parseInt(id!, 10);
      if (isNaN(mediaId)) {
        return NextResponse.json(
          { error: "Invalid media ID" },
          { status: 400 }
        );
      }

      result = await addMangaStocks(
        mediaId,
        userId,
        {
          characterNameFilter: characterNameFilter || undefined,
          minRoleImportance: minRole || undefined,
        },
        logContext
      );

      // Server-side log for import result
      console.log(
        `[admin/add-stocks] manga import by ${userId} for media ${mediaId}: added=${result.added}, updated=${result.updated}, failed=${result.failed}`
      );
    } else if (type === "character") {
      const characterId = parseInt(id!, 10);
      if (isNaN(characterId)) {
        return NextResponse.json(
          { error: "Invalid character ID" },
          { status: 400 }
        );
      }

      result = await addCharacterStocks(characterId, userId, logContext);
    } else if (type === "search") {
      result = await searchAndAddCharacterStocks(search!, userId, logContext);
    }

    const rateLimitStatus = getRateLimitStatus();

    return NextResponse.json({
      success: true,
      type,
      result,
      rateLimit: rateLimitStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in add-stocks API:", error);
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check rate limit status and get available operations
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Missing user ID" },
        { status: 401 }
      );
    }

    // Verify user exists
    let userDoc;
    try {
      userDoc = await userService.getById(userId);
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or premium
    const isAdmin = userDoc?.isAdmin;
    const isPremium = userDoc?.premiumMeta?.isPremium;

    if (!isAdmin && !isPremium) {
      return NextResponse.json(
        { error: "Admin or premium access required" },
        { status: 403 }
      );
    }

    const rateLimitStatus = getRateLimitStatus();

    return NextResponse.json({
      success: true,
      rateLimit: rateLimitStatus,
      availableOperations: [
        {
          type: "anime",
          description: "Add all characters from a specific anime",
          parameters: [
            "id (required): AniList anime ID",
            "characterNameFilter (optional): Filter by character name",
            "minRole (optional): MAIN | SUPPORTING | BACKGROUND",
          ],
        },
        {
          type: "character",
          description: "Add a character across all their anime appearances",
          parameters: ["id (required): AniList character ID"],
        },
        {
          type: "search",
          description: "Search for a character by name and add all appearances",
          parameters: ["search (required): Character name to search for"],
        },
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in add-stocks API GET:", error);
    return NextResponse.json(
      {
        error: "Failed to get rate limit status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
