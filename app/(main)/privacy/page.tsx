"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function PrivacyPage() {
  const dataCollectionMarkdown = `
We collect and store the following categories of data when you use the site:

- **Account identifiers:** user ID, username, display name, email, and created date.
- **Authentication data:** managed by Appwrite (passwords are never stored in this app).
- **Profile details:** avatar selection and profile preferences.
- **Trading data:** portfolio holdings, transactions, buy/sell history, and balances.
- **Community activity:** comments, reactions, reports, and content tags you set (e.g. spoiler/NSFW).
- **Messaging:** conversation membership and message content.
- **Social graph:** friend requests and accepted friendships.
- **Notifications & rewards:** notifications, awards, daily rewards, and appeals.
- **Device/local data:** local UI preferences stored in your browser.
`;

  const usageMarkdown = `
We use your information to:

- operate the trading game and social features,
- display your profile and activity to you (and others when public),
- manage moderation, safety, and system events,
- provide exports and account deletion tools.
`;

  const storageMarkdown = `
Your account data is stored in Appwrite (auth + database). Local UI preferences are stored in your browser.
We do **not** sell your data.
`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Market
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">Last updated: December 23th</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Important Disclaimer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  Character Ownership Notice
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  This application is a fan-made project and does not claim
                  ownership of any anime characters, series, or intellectual
                  property featured within it. All characters, anime series, and
                  related content belong to their respective copyright holders
                  and creators.
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                  If you are a copyright holder and believe your intellectual
                  property has been used inappropriately, please contact us
                  immediately for removal.
                </p>
              </div>

              <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    Contact for Takedown Requests
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    antonioarcher.dev@gmail.com
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Information We Collect</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-2">{children}</p>,
                    ul: ({ children }) => (
                      <ul className="list-disc pl-5">{children}</ul>
                    ),
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    strong: ({ children }) => (
                      <strong className="font-semibold">{children}</strong>
                    ),
                  }}
                >
                  {dataCollectionMarkdown}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-2">{children}</p>,
                    ul: ({ children }) => (
                      <ul className="list-disc pl-5">{children}</ul>
                    ),
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                  }}
                >
                  {usageMarkdown}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Security</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-2">{children}</p>,
                    strong: ({ children }) => (
                      <strong className="font-semibold">{children}</strong>
                    ),
                  }}
                >
                  {storageMarkdown}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If you have any questions about this Privacy Policy or need to
                request content removal, please contact us:
              </p>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="text-sm font-mono">
                  antonioarcher.dev@gmail.com
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
