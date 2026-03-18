export default function Head() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

  return (
    <>
      <title>Support the Project | Anime Stock Market</title>
      <meta
        name="description"
        content="Support Anime Stock Market with a donation, unlock premium perks, and learn how contributions help fund hosting, rewards, and new features."
      />
      <link rel="canonical" href={`${baseUrl}/donate`} />
    </>
  );
}
