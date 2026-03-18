export default function Head() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

  return (
    <>
      <title>Account Restricted | Anime Stock Market</title>
      <meta
        name="description"
        content="View account restriction details on Anime Stock Market, check ban or deletion timing, and submit an appeal to the moderation team."
      />
      <meta name="robots" content="noindex,nofollow" />
      <link rel="canonical" href={`${baseUrl}/jail`} />
    </>
  );
}
