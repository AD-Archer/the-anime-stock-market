"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-muted-foreground">
            Last updated: November 2, 2025
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Important Legal Notice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                      Copyright and Intellectual Property
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      This application is a fan-made project for entertainment
                      purposes only. We do not claim ownership of any anime
                      characters, series, images, or intellectual property
                      featured within this application. All rights belong to
                      their respective copyright holders and creators.
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                      By using this application, you acknowledge that this is a
                      parody/fan-made project and not an official product of any
                      anime company or character rights holder.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    DMCA & Takedown Requests
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
              <CardTitle>Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                By accessing and using the Anime Stock Market application, you
                accept and agree to be bound by the terms and provision of this
                agreement. If you do not agree to abide by the above, please do
                not use this service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Use License</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Permission is granted to temporarily use the Anime Stock
                  Market application for personal, non-commercial entertainment
                  purposes only.
                </p>
                <p>This permission does not include:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Commercial use or resale of the application</li>
                  <li>Modification or distribution of the source code</li>
                  <li>Use of the application for any illegal purposes</li>
                  <li>
                    Claiming ownership of any featured characters or content
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>As a user of this application, you agree to:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Use the application only for lawful purposes</li>
                  <li>
                    Not attempt to reverse engineer or modify the application
                  </li>
                  <li>
                    Not use the application to harass, abuse, or harm others
                  </li>
                  <li>Respect the intellectual property rights of others</li>
                  <li>
                    Report any inappropriate content or copyright violations
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Disclaimer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  The information on this application is provided on an &apos;as
                  is&apos; basis. To the fullest extent permitted by law, this
                  application excludes all representations, warranties,
                  conditions and terms whether express or implied, statutory or
                  otherwise.
                </p>
                <p>
                  This application does not guarantee the accuracy,
                  completeness, or timeliness of any information provided. The
                  trading simulation is for entertainment purposes only and does
                  not involve real money or assets.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                In no event shall the Anime Stock Market or its creators be
                liable for any direct, indirect, incidental, special, or
                consequential damages arising out of or in any way connected
                with the use of this application, whether based on contract,
                tort, strict liability, or otherwise, even if advised of the
                possibility of such damages.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Termination</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We may terminate or suspend access to our service immediately,
                without prior notice or liability, for any reason whatsoever,
                including without limitation if you breach the Terms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Governing Law</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                These Terms shall be interpreted and governed by the laws of the
                jurisdiction in which the service is provided, without regard to
                conflict of law provisions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We use Plausible Analytics to collect anonymous usage data to
                improve the service and diagnose issues. Plausible does not
                collect personally-identifiable information by default.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If you have any questions about these Terms of Service or need
                to report copyright violations, please contact us:
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
