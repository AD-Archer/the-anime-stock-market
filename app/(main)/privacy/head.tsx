export default function Head() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

  return (
    <>
      <title>Privacy Policy | Anime Stock Market</title>
      <meta
        name="description"
        content="Read the Anime Stock Market privacy policy to see what account, trading, messaging, and device data we collect, store, and protect."
      />
      <link rel="canonical" href={`${baseUrl}/privacy`} />
    </>
  );
}
