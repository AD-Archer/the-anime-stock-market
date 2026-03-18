export default function Head() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

  return (
    <>
      <title>Options Trading | Anime Stock Market</title>
      <meta
        name="description"
        content="Trade call and put style bets on Anime Stock Market, explore option chains, track hot strikes, and speculate on character price moves."
      />
      <link rel="canonical" href={`${baseUrl}/options`} />
    </>
  );
}
