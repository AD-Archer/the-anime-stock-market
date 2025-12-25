import React from "react";

export default async function Head({ params }: { params: { id: string } }) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://animestockexchange.adarcher.app";
  const defaultOg = `${siteUrl}/icons/icon1.png`;
  const id = params.id;

  let title = "Anime — Anime Stock Exchange";
  let description =
    "Trade your favorite anime characters in real-time on Anime Stock Exchange.";
  let image = defaultOg;
  let url = `${siteUrl}/anime/${id}`;

  try {
    const { stockService } = await import("@/lib/database/stockService");
    const stock = await stockService.getById(id);
    if (stock) {
      title = `${stock.characterName} — ${stock.anime} | Anime Stock Exchange`;
      description =
        (stock.description && stock.description.slice(0, 160)) ||
        `Trade ${stock.characterName} from ${stock.anime} on Anime Stock Exchange.`;
      if (stock.imageUrl) {
        image = stock.imageUrl.startsWith("http")
          ? stock.imageUrl
          : `${siteUrl}${stock.imageUrl}`;
      }
    }
  } catch (err) {
    // ignore, fall back to defaults
  }

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="article" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      <link rel="canonical" href={url} />
    </>
  );
}
