import React from "react";
import { generateCharacterSlug } from "@/lib/utils";

export default async function Head({ params }: { params: { id: string } }) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";
  const defaultOg = `${siteUrl}/icons/images.jpg`;
  const id = params.id;

  let title = "Character — Anime Stock Market";
  let description = "Character page on Anime Stock Market.";
  let image = defaultOg;
  let url = `${siteUrl}/character/${id}`;
  let keywords: string[] = [
    "anime stocks",
    "character stocks",
    "anime stock market",
  ];

  try {
    const { stockService } = await import("@/lib/database/stockService");
    const stocks = await stockService.getAll();
    const normalizedId = generateCharacterSlug(id);
    const stock =
      stocks.find((s) => s.characterSlug === id) ||
      stocks.find(
        (s) => generateCharacterSlug(s.characterSlug) === normalizedId
      ) ||
      stocks.find(
        (s) => generateCharacterSlug(s.characterName) === normalizedId
      ) ||
      stocks.find((s) => s.id === id);

    if (stock) {
      const { characterName, anime, description: stockDesc, imageUrl } = stock;

      // Create SEO-friendly keywords including anime name
      const seoPhrases = [
        `${characterName} stock`,
        `${characterName} stocks`,
        `${anime} stocks`,
        `${anime} stock market`,
        `${characterName} from ${anime}`,
        "anime stock market",
        "character stocks",
      ];

      title = `${characterName} (${anime}) Stock - Buy & Trade | Anime Stock Market`;
      description =
        (stockDesc && stockDesc.slice(0, 160)) ||
        `Trade ${characterName} stocks from ${anime}. Buy, sell, and invest in ${characterName} on the Anime Stock Market. Real-time price updates and trading.`;

      keywords = Array.from(new Set(seoPhrases));

      if (imageUrl) {
        image = imageUrl.startsWith("http")
          ? imageUrl
          : `${siteUrl}${imageUrl}`;
      }

      url = `${siteUrl}/character/${encodeURIComponent(
        stock.characterSlug || generateCharacterSlug(characterName)
      )}`;
    }
  } catch (err) {
    // ignore
  }

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(", ")} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      <link rel="canonical" href={url} />
    </>
  );
}
