"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { extractUrls, isExternalUrl } from "@/lib/chat/link-utils";
import { LinkPreviewList } from "@/components/chat/link-preview";
import { SafeLink } from "@/components/chat/safe-link";
import { cn } from "@/lib/utils";

type MessageContentProps = {
  content: string;
  className?: string;
  enablePreviews?: boolean;
  linkClassName?: string;
};

export function MessageContent({
  content,
  className,
  enablePreviews = true,
  linkClassName = "text-primary underline",
}: MessageContentProps) {
  const previewUrls = useMemo(() => {
    if (!enablePreviews) return [];
    return extractUrls(content).filter(isExternalUrl).slice(0, 3);
  }, [content, enablePreviews]);

  return (
    <div className={cn("space-y-2 break-words min-w-0", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) =>
            href ? (
              <SafeLink href={href} className={linkClassName}>
                {children}
              </SafeLink>
            ) : (
              <span>{children}</span>
            ),
          p: ({ children }) => (
            <p className="text-sm leading-relaxed break-words">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 text-sm space-y-1 break-words">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 text-sm space-y-1 break-words">
              {children}
            </ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-muted pl-3 text-sm text-muted-foreground break-words">
              {children}
            </blockquote>
          ),
          code: ({ inline, children }) =>
            inline ? (
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                {children}
              </code>
            ) : (
              <pre className="rounded bg-muted p-2 text-xs overflow-x-auto max-w-full">
                <code>{children}</code>
              </pre>
            ),
        }}
      >
        {content}
      </ReactMarkdown>
      {previewUrls.length > 0 && <LinkPreviewList urls={previewUrls} />}
    </div>
  );
}
