import React from "react";
import { generateAnimeSlug } from "@/lib/utils";
import { stockService } from "@/lib/database/stockService";

export default async function Head({ params }: { params: { id: string } }) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";
  const defaultOg = `${siteUrl}/icons/images.jpg`;
  const id = params.id;

  let title = "Anime — Anime Stock Market";
  let description = "Anime page on Anime Stock Market.";
  let image = defaultOg;
  let url = `${siteUrl}/anime/${id}`;
  let keywords: string[] = [
    "anime stock market",
    "anime stocks",
    "character stocks",
  ];

  try {
    const stocks = await stockService.getAll();
    const animeCharacters = stocks.filter(
      (s) => generateAnimeSlug(s.anime) === id
    );

    const animeName =
      animeCharacters.length > 0 ? animeCharacters[0].anime : null;

    if (animeName) {
      const topCharacters = animeCharacters
        .slice(0, 3)
        .map((s) => s.characterName);

      title = `${animeName} stocks — Anime Stock Market`;

      const seoPhrases = [
        `${animeName} stocks`,
        "anime stock market",
        "character stocks",
      ];

      if (topCharacters[0]) {
        seoPhrases.push(
          `${topCharacters[0]} stock market`,
          `${topCharacters[0]} stock exchange`
        );
      }

      const topCharsStr = topCharacters.join(", ");

      description = `${animeName} stocks and character markets — trade ${
        topCharsStr || "popular characters"
      } and more on Anime Stock Market. Keywords: ${seoPhrases.join(", ")}`;

      keywords = Array.from(
        new Set([...keywords, ...seoPhrases, ...topCharacters])
      );

      const anyImage = animeCharacters.find((s) => s.animeImageUrl);
      if (anyImage && anyImage.animeImageUrl) {
        image = anyImage.animeImageUrl.startsWith("http")
          ? anyImage.animeImageUrl
          : `${siteUrl}${anyImage.animeImageUrl}`;
      }

      url = `${siteUrl}/anime/${generateAnimeSlug(animeName)}`;
    }
  } catch (err) {
    // ignore errors and fall back to defaults
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
