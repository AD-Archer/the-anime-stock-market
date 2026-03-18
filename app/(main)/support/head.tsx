export default function Head() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

  return (
    <>
      <title>Support Center | Anime Stock Market</title>
      <meta
        name="description"
        content="Contact Anime Stock Market support to report bugs, ask account questions, track ticket updates, and get help with trades, rewards, or premium access."
      />
      <meta name="robots" content="noindex,nofollow" />
      <link rel="canonical" href={`${baseUrl}/support`} />
    </>
  );
}
