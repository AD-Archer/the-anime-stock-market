"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
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
          <p className="text-muted-foreground">
            Last updated: November 2, 2025
          </p>
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
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Account Information</h3>
                  <p className="text-sm text-muted-foreground">
                    When you create an account, we collect your username, email
                    address, and account preferences. All data is stored locally
                    in your browser and is not transmitted to any external
                    servers.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Usage Data</h3>
                  <p className="text-sm text-muted-foreground">
                    We collect anonymous usage statistics through Vercel
                    Analytics to understand how the application is used and to
                    improve the user experience. This data does not contain
                    personally identifiable information.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Local Storage</h3>
                  <p className="text-sm text-muted-foreground">
                    The application uses browser local storage to save your
                    portfolio data, transaction history, and user preferences.
                    This data remains on your device and is not accessible by
                    us.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  • To provide and maintain the trading platform functionality
                </li>
                <li>• To save your portfolio and transaction data locally</li>
                <li>
                  • To improve the application based on anonymous usage patterns
                </li>
                <li>
                  • To respond to copyright takedown requests and legal
                  inquiries
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Security</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Since all user data is stored locally in your browser, we do not
                have access to your personal information or trading data. The
                application does not transmit sensitive data to external
                servers. However, we recommend using strong passwords and
                keeping your browser updated for optimal security.
              </p>
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
