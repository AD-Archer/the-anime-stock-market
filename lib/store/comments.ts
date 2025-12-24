import type { StoreApi } from "zustand";
import type { Comment, CommentSnapshot, ContentTag } from "../types";
import { commentService } from "../database";
import type { StoreState } from "./types";

type StoreMutators = Pick<StoreApi<StoreState>, "setState" | "getState">;

const applyUpdater = <T,>(
  current: T,
  updater: T | ((prev: T) => T)
): T => (typeof updater === "function" ? (updater as (prev: T) => T)(current) : updater);

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export function createCommentActions({ setState, getState }: StoreMutators) {
  const setComments = (
    updater: Comment[] | ((prev: Comment[]) => Comment[])
  ) =>
    setState((state) => ({
      comments: applyUpdater(state.comments, updater),
    }));

  const addComment = async ({
    animeId,
    content,
    characterId,
    parentId,
    tags = [],
  }: {
    animeId?: string;
    content: string;
    characterId?: string;
    parentId?: string;
    tags?: ContentTag[];
  }) => {
    const currentUser = getState().currentUser;
    if (!currentUser) return;

    const normalizedTags = tags.filter(
      (tag): tag is ContentTag => tag === "nsfw" || tag === "spoiler"
    );

    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      userId: currentUser.id,
      animeId,
      characterId,
      content,
      timestamp: new Date(),
      parentId,
      tags: normalizedTags,
      likedBy: [],
      dislikedBy: [],
    };
    setComments((prev) => [...prev, tempComment]);

    try {
      const newComment = await commentService.create({
        userId: currentUser.id,
        animeId,
        characterId,
        content,
        timestamp: new Date(),
        parentId,
        tags: normalizedTags,
        likedBy: [],
        dislikedBy: [],
      });

      setComments((prev) =>
        prev.map((c) => (c.id === tempComment.id ? newComment : c))
      );

      const state = getState();
      const hasCommentMaster = state.awards.some(
        (a) => a.userId === currentUser.id && a.type === "comment_master"
      );
      if (!hasCommentMaster) {
        const count = state.comments.filter((c) => c.userId === currentUser.id).length;
        if (count >= 50) {
          // Unlock immediately once achieved.
          state.unlockAward(currentUser.id, "comment_master").catch(() => {});
        }
      }
    } catch (error) {
      console.warn("Failed to save comment to database:", error);
      setComments((prev) => prev.filter((c) => c.id !== tempComment.id));
    }
  };

  const editComment = async (commentId: string, content: string) => {
    const currentUser = getState().currentUser;
    if (!currentUser) return;

    try {
      await commentService.update(commentId, { content });
    } catch (error) {
      console.warn("Failed to update comment:", error);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content } : c))
      );
    }
  };

  const deleteComment = async (commentId: string) => {
    const currentUser = getState().currentUser;
    if (!currentUser) return;

    try {
      await commentService.delete(commentId);
    } catch (error) {
      console.warn("Failed to delete comment:", error);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  };

  const getAnimeComments = (animeId: string): Comment[] => {
    return getState()
      .comments.filter((c) => c.animeId === animeId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const getCharacterComments = (characterId: string): Comment[] => {
    return getState()
      .comments.filter((c) => c.characterId === characterId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const getMarketComments = (): Comment[] => {
    return getState()
      .comments.filter((c) => !c.animeId && !c.characterId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const toggleCommentReaction = async (
    commentId: string,
    reaction: "like" | "dislike"
  ) => {
    const currentUser = getState().currentUser;
    if (!currentUser) return;

    const applyReaction = (comment: Comment): Comment => {
      const likedBy = comment.likedBy ? [...comment.likedBy] : [];
      const dislikedBy = comment.dislikedBy ? [...comment.dislikedBy] : [];
      const hasLiked = likedBy.includes(currentUser.id);
      const hasDisliked = dislikedBy.includes(currentUser.id);

      if (reaction === "like") {
        const updatedLiked = hasLiked
          ? likedBy.filter((id) => id !== currentUser.id)
          : [...likedBy, currentUser.id];
        const updatedDisliked = hasDisliked
          ? dislikedBy.filter((id) => id !== currentUser.id)
          : dislikedBy;
        return {
          ...comment,
          likedBy: updatedLiked,
          dislikedBy: updatedDisliked,
        };
      }

      const updatedDisliked = hasDisliked
        ? dislikedBy.filter((id) => id !== currentUser.id)
        : [...dislikedBy, currentUser.id];
      const updatedLiked = hasLiked
        ? likedBy.filter((id) => id !== currentUser.id)
        : likedBy;
      return {
        ...comment,
        likedBy: updatedLiked,
        dislikedBy: updatedDisliked,
      };
    };

    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId ? applyReaction(comment) : comment
      )
    );

    const targetComment = getState().comments.find((c) => c.id === commentId);
    if (!targetComment) return;

    const updated = applyReaction(targetComment);

    try {
      await commentService.update(commentId, {
        likedBy: updated.likedBy,
        dislikedBy: updated.dislikedBy,
      });
    } catch (error) {
      console.warn("Failed to update reaction:", error);
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId ? targetComment : comment
        )
      );
    }
  };

  const buildThreadContext = (targetCommentId: string): CommentSnapshot[] => {
    const comments = getState().comments;
    const commentMap = new Map(comments.map((comment) => [comment.id, comment]));
    const childrenMap = new Map<string, string[]>();

    comments.forEach((comment) => {
      if (!comment.parentId) return;
      const existing = childrenMap.get(comment.parentId) ?? [];
      existing.push(comment.id);
      childrenMap.set(comment.parentId, existing);
    });

    childrenMap.forEach((ids, parentId) => {
      ids.sort((a, b) => {
        const aTime = commentMap.get(a)?.timestamp.getTime() ?? 0;
        const bTime = commentMap.get(b)?.timestamp.getTime() ?? 0;
        return aTime - bTime;
      });
    });

    const findRootId = (commentId: string): string | null => {
      let current = commentMap.get(commentId);
      if (!current) return null;
      while (current.parentId) {
        const parent = commentMap.get(current.parentId);
        if (!parent) break;
        current = parent;
      }
      return current.id;
    };

    const rootId = findRootId(targetCommentId);
    if (!rootId) return [];

    const snapshots: CommentSnapshot[] = [];
    const traverse = (commentId: string) => {
      const node = commentMap.get(commentId);
      if (!node) return;
      snapshots.push({
        id: node.id,
        userId: node.userId,
        animeId: node.animeId ?? "",
        characterId: node.characterId,
        content: node.content,
        parentId: node.parentId,
        timestamp: node.timestamp,
        tags: node.tags ?? [],
      });
      const children = childrenMap.get(commentId) ?? [];
      children.forEach(traverse);
    };

    traverse(rootId);
    return snapshots;
  };

  const describeCommentLocation = (
    location?: { animeId: string; characterId?: string } | null
  ): string => {
    const stocks = getState().stocks;
    if (!location) return "the platform";
    if (location.characterId) {
      const stock = stocks.find((s) => s.id === location.characterId);
      if (stock) {
        return `${stock.characterName} (${stock.anime})`;
      }
      return `character thread (${location.characterId})`;
    }
    const stockMatch = stocks.find(
      (s) => slugify(s.anime) === location.animeId
    );
    return stockMatch ? stockMatch.anime : location.animeId;
  };

  return {
    addComment,
    editComment,
    deleteComment,
    getAnimeComments,
    getCharacterComments,
    getMarketComments,
    toggleCommentReaction,
    buildThreadContext,
    describeCommentLocation,
  };
}
