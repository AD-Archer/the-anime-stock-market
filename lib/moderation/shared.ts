export type ModerationSurface = "comment" | "direct_message";

export type ModerationDecision = {
  allowed: boolean;
  blockedTerms: string[];
  cleanedText?: string;
  reason?: string;
};

const formatBlockedTerms = (terms: string[]) => {
  if (terms.length === 0) return "profanity";
  if (terms.length === 1) return "profanity";
  return "profanity";
};

export const buildProfanityDecision = ({
  hasProfanity,
  blockedTerms,
  cleanedText,
  surface,
}: {
  hasProfanity: boolean;
  blockedTerms: string[];
  cleanedText?: string;
  surface: ModerationSurface;
}): ModerationDecision => {
  if (!hasProfanity) {
    return {
      allowed: true,
      blockedTerms: [],
      cleanedText,
    };
  }

  const target = surface === "direct_message" ? "message" : "comment";

  return {
    allowed: false,
    blockedTerms,
    cleanedText,
    reason: `That ${target} was blocked because it appears to contain ${formatBlockedTerms(
      blockedTerms
    )}. Please rewrite it and try again.`,
  };
};
