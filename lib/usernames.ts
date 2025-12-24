export const makeUniqueUsername = (
  base: string,
  existingUsernames: Iterable<string>
): string => {
  const trimmed = base.trim();
  const seed = trimmed.length > 0 ? trimmed : "user";
  const existing = new Set(
    Array.from(existingUsernames, (name) => name.toLowerCase())
  );

  let candidate = seed;
  let suffix = 1;

  while (existing.has(candidate.toLowerCase())) {
    suffix += 1;
    candidate = `${seed}${suffix}`;
  }

  return candidate;
};

// Generate a friendly random username, e.g., "brave-otter" or "crimson-fox".
export const generateRandomUsername = (
  existingUsernames: Iterable<string>
): string => {
  const adjectives = [
    "brave",
    "mighty",
    "swift",
    "silent",
    "lucky",
    "clever",
    "crimson",
    "ember",
    "frozen",
    "golden",
    "shadow",
    "stellar",
  ];
  const animals = [
    "otter",
    "fox",
    "wolf",
    "tiger",
    "dragon",
    "panda",
    "falcon",
    "lynx",
    "phoenix",
    "orca",
    "koala",
    "eagle",
  ];

  const existing = new Set(
    Array.from(existingUsernames, (name) => name.toLowerCase())
  );

  for (let attempt = 0; attempt < 100; attempt++) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const base = `${adj}-${animal}`;
    let candidate = base;
    let suffix = 0;
    while (existing.has(candidate.toLowerCase())) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }

  // Fallback to numeric if we somehow exhaust attempts
  return makeUniqueUsername("user", existingUsernames);
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "user";

export const generateDisplaySlug = (
  displayName: string,
  existingSlugs: Iterable<string>
): string => {
  const base = slugify(displayName);
  const existing = new Set(
    Array.from(existingSlugs, (name) => name.toLowerCase())
  );

  if (!existing.has(base)) return base;

  let suffix = 1;
  let candidate = `${base}-${suffix}`;
  while (existing.has(candidate.toLowerCase())) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
};
