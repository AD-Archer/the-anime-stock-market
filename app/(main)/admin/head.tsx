export default function Head() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

  return (
    <>
      <title>Admin Panel | Anime Stock Market</title>
      <meta
        name="description"
        content="Manage stocks, users, reports, support tickets, notifications, appeals, and market tools from the Anime Stock Market admin panel."
      />
      <meta name="robots" content="noindex,nofollow" />
      <link rel="canonical" href={`${baseUrl}/admin`} />
    </>
  );
}
