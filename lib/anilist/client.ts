/**
 * AniList GraphQL API Client
 * Handles rate limiting (30 requests per minute) and common queries
 */

const ANILIST_API_ENDPOINT = "https://graphql.anilist.co";
const RATE_LIMIT = 30; // requests per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute in ms

interface RateLimitState {
  requestCount: number;
  windowStart: number;
}

const rateLimitState: RateLimitState = {
  requestCount: 0,
  windowStart: Date.now(),
};

/**
 * Wait if necessary to respect rate limits
 */
async function checkRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceWindowStart = now - rateLimitState.windowStart;

  // Reset window if it's been a minute
  if (timeSinceWindowStart >= RATE_LIMIT_WINDOW) {
    rateLimitState.requestCount = 0;
    rateLimitState.windowStart = now;
  }

  // If we've hit the limit, wait
  if (rateLimitState.requestCount >= RATE_LIMIT) {
    const waitTime = RATE_LIMIT_WINDOW - timeSinceWindowStart + 100; // +100ms buffer
    console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    rateLimitState.requestCount = 0;
    rateLimitState.windowStart = Date.now();
  }
}

/**
 * Execute a GraphQL query against the AniList API
 */
export async function queryAniList<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  await checkRateLimit();
  rateLimitState.requestCount++;

  const response = await fetch(ANILIST_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: variables || {},
    }),
  });

  if (!response.ok) {
    throw new Error(
      `AniList API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(`AniList GraphQL error: ${JSON.stringify(data.errors)}`);
  }

  return data.data as T;
}

/**
 * Fetch media (anime) with characters by ID
 */
export async function fetchMediaWithCharacters(mediaId: number) {
  const query = `
    query ($id: Int!) {
      Media(id: $id, type: ANIME) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          large
        }
        rankings {
          rank
          type
          format
          year
          season
          allTime
          context
        }
        characters(sort: ROLE) {
          edges {
            node {
              id
              name {
                full
                native
              }
              image {
                large
              }
              description
            }
            role
          }
        }
      }
    }
  `;

  interface Character {
    id: number;
    name: {
      full: string;
      native: string | null;
    };
    image: {
      large: string | null;
    };
    description: string | null;
  }

  interface CharacterEdge {
    node: Character;
    role: string;
  }

  interface MediaRanking {
    rank: number;
    type: string;
    format: string;
    year?: number;
    season?: string;
    allTime: boolean;
    context: string;
  }

  interface MediaTitle {
    romaji: string;
    english: string | null;
    native: string | null;
  }

  interface CoverImage {
    large: string | null;
  }

  interface Media {
    id: number;
    title: MediaTitle;
    coverImage: CoverImage;
    rankings: MediaRanking[];
    characters: {
      edges: CharacterEdge[];
    };
  }

  interface MediaResponse {
    Media: Media;
  }

  const result = await queryAniList<MediaResponse>(query, { id: mediaId });
  return result.Media;
}

/**
 * Search for media by title
 */
export async function searchMedia(
  query: string,
  type: "ANIME" | "MANGA" = "ANIME"
) {
  const gql = `
    query ($search: String!, $type: MediaType!) {
      Page(perPage: 10) {
        media(search: $search, type: $type) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
          }
        }
      }
    }
  `;

  interface SearchMedia {
    id: number;
    title: {
      romaji: string;
      english: string | null;
      native: string | null;
    };
    coverImage: {
      large: string | null;
    };
  }

  interface SearchResponse {
    Page: {
      media: SearchMedia[];
    };
  }

  const result = await queryAniList<SearchResponse>(gql, {
    search: query,
    type,
  });
  return result.Page.media;
}

/**
 * Fetch character by ID
 */
export async function fetchCharacter(characterId: number) {
  const query = `
    query ($id: Int!) {
      Character(id: $id) {
        id
        name {
          full
          native
        }
        image {
          large
        }
        description
        media {
          edges {
            node {
              id
              title {
                romaji
                english
              }
            }
          }
        }
      }
    }
  `;

  interface CharacterMedia {
    node: {
      id: number;
      title: {
        romaji: string;
        english: string | null;
      };
    };
  }

  interface CharacterData {
    id: number;
    name: {
      full: string;
      native: string | null;
    };
    image: {
      large: string | null;
    };
    description: string | null;
    media: {
      edges: CharacterMedia[];
    };
  }

  interface CharacterResponse {
    Character: CharacterData;
  }

  const result = await queryAniList<CharacterResponse>(query, {
    id: characterId,
  });
  return result.Character;
}

/**
 * Search for characters by name
 */
export async function searchCharacters(query: string) {
  const gql = `
    query ($search: String!) {
      Page(perPage: 25) {
        characters(search: $search) {
          id
          name {
            full
            native
          }
          image {
            large
          }
        }
      }
    }
  `;

  interface SearchCharacter {
    id: number;
    name: {
      full: string;
      native: string | null;
    };
    image: {
      large: string | null;
    };
  }

  interface SearchResponse {
    Page: {
      characters: SearchCharacter[];
    };
  }

  const result = await queryAniList<SearchResponse>(gql, { search: query });
  return result.Page.characters;
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus() {
  const now = Date.now();
  const timeSinceWindowStart = now - rateLimitState.windowStart;
  const timeUntilReset = Math.max(0, RATE_LIMIT_WINDOW - timeSinceWindowStart);

  return {
    requestsUsed: rateLimitState.requestCount,
    requestsRemaining: Math.max(0, RATE_LIMIT - rateLimitState.requestCount),
    totalRequestsAllowed: RATE_LIMIT,
    timeUntilReset,
    windowStartTime: rateLimitState.windowStart,
  };
}
