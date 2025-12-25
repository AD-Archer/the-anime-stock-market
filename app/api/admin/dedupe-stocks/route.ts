import { NextResponse } from "next/server";
import { stockService } from "@/lib/database";
import { isSameName } from "@/lib/utils/slug";

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function deleteWithRetry(id: string, maxAttempts = 5) {
  let attempt = 0;
  let backoff = 500;
  while (attempt < maxAttempts) {
    try {
      await stockService.delete(id);
      return;
    } catch (err: any) {
      attempt++;
      // If Appwrite rate limit error, wait and retry
      const code = err?.code ?? err?.status ?? null;
      if (code === 429) {
        // exponential backoff
        await sleep(backoff);
        backoff = Math.min(backoff * 2, 5000);
        continue;
      }
      // For other errors, rethrow to be handled by caller
      throw err;
    }
  }
  throw new Error(
    `Failed to delete ${id} after ${maxAttempts} attempts due to rate limits`
  );
}

export async function POST(req: Request) {
  try {
    const stocks = await stockService.getAll();

    // Group by Anilist ID when available, otherwise by normalized name
    const groups = new Map<string, typeof stocks>();

    for (const s of stocks) {
      const key = s.anilistCharacterId
        ? `id:${s.anilistCharacterId}`
        : `name:${s.characterName.toLowerCase().trim()}`;
      if (!groups.has(key)) groups.set(key, [] as any);
      groups.get(key)!.push(s);
    }

    const merged: Array<{ kept: string; removed: string[] }> = [];
    const errors: Array<{ type: string; id?: string; message: string }> = [];

    for (const [key, items] of groups.entries()) {
      if (items.length <= 1) continue;

      // Try to further dedupe by normalized name when grouped by name
      const buckets: Array<typeof items> = [];
      for (const item of items) {
        let placed = false;
        for (const b of buckets) {
          if (isSameName(b[0].characterName, item.characterName)) {
            b.push(item);
            placed = true;
            break;
          }
        }
        if (!placed) buckets.push([item]);
      }

      for (const bucket of buckets) {
        if (bucket.length <= 1) continue;

        // Choose primary as the earliest createdAt
        bucket.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const primary = bucket[0];
        const toMerge = bucket.slice(1);

        // Merge anilistMediaIds, descriptions, images
        const mergedMedia = Array.from(
          new Set([
            ...(primary.anilistMediaIds || []),
            ...toMerge.flatMap((t) => t.anilistMediaIds || []),
          ])
        );
        const imageUrl =
          primary.imageUrl || toMerge.find((t) => t.imageUrl)?.imageUrl;
        const animeImageUrl =
          primary.animeImageUrl ||
          toMerge.find((t) => t.animeImageUrl)?.animeImageUrl;
        const description = [
          primary.description,
          ...toMerge.map((t) => t.description || ""),
        ].sort((a, b) => b.length - a.length)[0];

        try {
          await stockService.update(primary.id, {
            anilistMediaIds: mergedMedia,
            imageUrl,
            animeImageUrl,
            description,
          });
        } catch (err) {
          console.error(`Failed to update primary stock ${primary.id}:`, err);
          errors.push({ type: "update", id: primary.id, message: String(err) });
        }

        const removedIds: string[] = [];
        for (const rm of toMerge) {
          try {
            // delete with retries and backoff
            await deleteWithRetry(rm.id);
            removedIds.push(rm.id);
          } catch (err) {
            console.error(`Failed to delete stock ${rm.id}:`, err);
            errors.push({ type: "delete", id: rm.id, message: String(err) });
          }

          // Small delay to avoid hitting rate limits
          await sleep(150);
        }

        merged.push({ kept: primary.id, removed: removedIds });
      }
    }

    return NextResponse.json({ merged, errors, count: merged.length });
  } catch (err) {
    console.error("Failed to dedupe stocks", err);
    return NextResponse.json(
      { error: (err as Error).message || String(err) },
      { status: 500 }
    );
  }
}
