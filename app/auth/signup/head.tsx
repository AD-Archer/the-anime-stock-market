export default function Head() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

  return (
    <>
      <title>Create Account | Anime Stock Market</title>
      <meta
        name="description"
        content="Create an Anime Stock Market account to trade character stocks, build a portfolio, earn daily rewards, and join the community."
      />
      <meta name="robots" content="noindex,nofollow" />
      <link rel="canonical" href={`${baseUrl}/auth/signup`} />
    </>
  );
}
