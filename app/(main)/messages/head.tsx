export default function Head() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

  return (
    <>
      <title>Messages | Anime Stock Market</title>
      <meta
        name="description"
        content="Send direct messages on Anime Stock Market, manage conversations, reply to traders, and stay connected with friends, offers, and community updates."
      />
      <meta name="robots" content="noindex,nofollow" />
      <link rel="canonical" href={`${baseUrl}/messages`} />
    </>
  );
}
