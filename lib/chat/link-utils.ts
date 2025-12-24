export const extractUrls = (content: string): string[] => {
  if (!content) return [];
  const matches = content.match(
    /\bhttps?:\/\/[^\s<>()]+/gi
  );
  if (!matches) return [];
  const normalized = matches
    .map((url) => url.replace(/[),.;!?]+$/g, ""))
    .filter(Boolean);
  return Array.from(new Set(normalized));
};

export const isExternalUrl = (url: string): boolean => {
  try {
    const target = new URL(url);
    if (typeof window === "undefined") return true;
    const current = new URL(window.location.origin);
    return target.origin !== current.origin;
  } catch {
    return false;
  }
};
