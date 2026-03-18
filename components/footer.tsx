"use client";

import Link from "next/link";
import { Github, Shield, FileText, Heart } from "lucide-react";

export function Footer() {
  const footerLinks: Array<{
    href: string;
    label: string;
    icon: typeof Shield;
    external?: boolean;
  }> = [
    {
      href: "/privacy",
      label: "Privacy Policy",
      icon: Shield,
    },
    {
      href: "/terms",
      label: "Terms of Service",
      icon: FileText,
    },
    {
      href: "/support",
      label: "Support",
      icon: Shield,
    },
    {
      href: "/donate",
      label: "Donate",
      icon: Heart,
    },
    {
      href: "https://github.com/AD-Archer/the-anime-stock-market",
      label: "GitHub",
      icon: Github,
      external: true,
    },
  ] as const;

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              © 2025 Anime Stock Market. All rights reserved.
            </Link>
          </div>

           <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
             {footerLinks.map(({ href, label, icon: Icon, external = false }) => (
               <Link
                 key={href}
                 href={href}
                 target={external ? "_blank" : undefined}
                 rel={external ? "noopener noreferrer" : undefined}
                 aria-label={label}
                 className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
               >
                 <Icon className="h-4 w-4" />
                 <span className="hidden sm:inline">{label}</span>
               </Link>
             ))}
           </div>
        </div>
      </div>
    </footer>
  );
}
