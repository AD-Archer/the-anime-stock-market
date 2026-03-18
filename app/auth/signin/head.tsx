export default function Head() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

  return (
    <>
      <title>Sign In | Anime Stock Market</title>
      <meta
        name="description"
        content="Sign in to Anime Stock Market with email or Google to manage your portfolio, trade character stocks, claim rewards, and join the community."
      />
      <meta name="robots" content="noindex,nofollow" />
      <link rel="canonical" href={`${baseUrl}/auth/signin`} />
    </>
  );
}
