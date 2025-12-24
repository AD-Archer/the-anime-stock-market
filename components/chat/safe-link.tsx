"use client";

import type { AnchorHTMLAttributes } from "react";
import { isExternalUrl } from "@/lib/chat/link-utils";

type SafeLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export function SafeLink({ href, onClick, ...props }: SafeLinkProps) {
  return (
    <a
      href={href}
      target={isExternalUrl(href) ? "_blank" : props.target}
      rel={isExternalUrl(href) ? "noreferrer noopener" : props.rel}
      onClick={(event) => {
        if (isExternalUrl(href)) {
          event.preventDefault();
          const ok = window.confirm(
            "You are about to open an external link. Continue?"
          );
          if (!ok) return;
          window.open(href, "_blank", "noopener,noreferrer");
          return;
        }
        onClick?.(event);
      }}
      {...props}
    />
  );
}
