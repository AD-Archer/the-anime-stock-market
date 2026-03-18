export default function Head() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

  return (
    <>
      <title>Premium Membership | Anime Stock Market</title>
      <meta
        name="description"
        content="Explore Anime Stock Market premium perks, import characters, submit high-priority suggestions, and manage bonus rewards and daily quotas."
      />
      <link rel="canonical" href={`${baseUrl}/premium`} />
    </>
  );
}
