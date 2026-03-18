export default function Head() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

  return (
    <>
      <title>Terms of Service | Anime Stock Market</title>
      <meta
        name="description"
        content="Review Anime Stock Market terms covering fair use, account responsibilities, moderation, takedowns, and the rules for using the platform."
      />
      <link rel="canonical" href={`${baseUrl}/terms`} />
    </>
  );
}
