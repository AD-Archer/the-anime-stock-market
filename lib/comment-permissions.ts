import type { Comment, User } from "./types";

export const COMMENT_EDIT_WINDOW_MS = 30 * 60 * 1000;

export const canEditComment = (
  currentUser: User | null | undefined,
  comment: Comment
): boolean => {
  if (!currentUser) return false;
  if (currentUser.isAdmin) return true;
  if (currentUser.id !== comment.userId) return false;

  return (
    Date.now() - comment.timestamp.getTime() <= COMMENT_EDIT_WINDOW_MS
  );
};
