type UserAvatarInput = {
  id: string;
  username: string;
  avatarUrl?: string | null;
};

export const getUserInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .map((chunk) => chunk[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

export const getUserAvatarUrl = ({
  id,
  username,
  avatarUrl,
}: UserAvatarInput): string => {
  if (avatarUrl) return avatarUrl;
  const seed = encodeURIComponent(username || id);
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`;
};
