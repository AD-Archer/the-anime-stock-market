export default function Head() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

  return (
    <>
      <title>Daily Rewards | Anime Stock Market</title>
      <meta
        name="description"
        content="Claim daily rewards on Anime Stock Market, build login streaks, unlock milestone bonuses, and track awards earned from community activity."
      />
      <meta name="robots" content="noindex,nofollow" />
      <link rel="canonical" href={`${baseUrl}/rewards`} />
    </>
  );
}
