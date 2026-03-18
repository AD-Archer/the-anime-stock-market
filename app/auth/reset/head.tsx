export default function Head() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

  return (
    <>
      <title>Reset Password | Anime Stock Market</title>
      <meta
        name="description"
        content="Request a password reset for Anime Stock Market and regain access to your account so you can return to trading, rewards, and messages."
      />
      <meta name="robots" content="noindex,nofollow" />
      <link rel="canonical" href={`${baseUrl}/auth/reset`} />
    </>
  );
}
