"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { databases, ensureAppwriteInitialized } from "./appwrite/appwrite";
import {
  commentService,
  type CommentListScope,
} from "./database/commentService";
import {
  COMMENTS_COLLECTION,
  getRuntimeDatabaseId,
  mapComment,
} from "./database/utils";
import type { Comment } from "./types";

const PAGE_SIZE = 15;
const LOAD_MORE_THRESHOLD_PX = 120;

type ThreadedComment = Comment & { replies: ThreadedComment[] };

const dedupeAndSortComments = (comments: Comment[]): Comment[] =>
  Array.from(new Map(comments.map((comment) => [comment.id, comment])).values())
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

const buildThreadData = (comments: Comment[]) => {
  const commentMap = new Map<string, ThreadedComment>();
  const rootComments: ThreadedComment[] = [];

  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  comments.forEach((comment) => {
    const current = commentMap.get(comment.id);
    if (!current) return;

    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies.push(current);
        return;
      }
    }

    rootComments.push(current);
  });

  return { commentMap, rootComments };
};

const matchesScope = (comment: Comment, scope: CommentListScope) => {
  if (scope.kind === "market") {
    return (
      !comment.animeId && !comment.characterId && comment.premiumOnly !== true
    );
  }

  if (scope.kind === "anime") {
    return comment.animeId === scope.animeId && !comment.characterId;
  }

  return comment.characterId === scope.characterId;
};

export function usePaginatedComments(scope: CommentListScope) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const hasAutoScrolledRef = useRef(false);
  const shouldScrollToBottomRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const commentsCountRef = useRef(0);

  const scopeKey = useMemo(() => JSON.stringify(scope), [scope]);
  const stableScope = useMemo(
    () => JSON.parse(scopeKey) as CommentListScope,
    [scopeKey]
  );

  const hasMore = comments.length < total;

  useEffect(() => {
    commentsCountRef.current = comments.length;
  }, [comments.length]);

  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, []);

  const loadPage = useCallback(
    async (offset: number) => {
      const response = await commentService.listPage(
        stableScope,
        PAGE_SIZE,
        offset
      );
      setTotal(response.total);
      return dedupeAndSortComments(response.comments);
    },
    [stableScope]
  );

  const reload = useCallback(
    async (options?: {
      scrollToBottom?: boolean;
      preserveScroll?: boolean;
      showLoading?: boolean;
    }) => {
      const shouldShowLoading =
        options?.showLoading ?? commentsCountRef.current === 0;
      const shouldPreserveScroll =
        options?.preserveScroll ?? !options?.scrollToBottom;
      const container = containerRef.current;
      const previousHeight = container?.scrollHeight ?? 0;
      const previousTop = container?.scrollTop ?? 0;

      if (shouldShowLoading) {
        setIsInitialLoading(true);
      }

      if (options?.scrollToBottom) {
        shouldScrollToBottomRef.current = true;
      }

      const nextComments = await loadPage(0);
      setComments(nextComments);
      if (shouldShowLoading) {
        setIsInitialLoading(false);
      }

      if (shouldPreserveScroll && !options?.scrollToBottom) {
        requestAnimationFrame(() => {
          const current = containerRef.current;
          if (!current) return;
          current.scrollTop =
            current.scrollHeight - previousHeight + previousTop;
        });
      }
    },
    [loadPage]
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current) return;
    if (!hasMore) return;

    const container = containerRef.current;
    const previousHeight = container?.scrollHeight ?? 0;
    const previousTop = container?.scrollTop ?? 0;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    const olderComments = await loadPage(comments.length);
    setComments((prev) => dedupeAndSortComments([...olderComments, ...prev]));

    requestAnimationFrame(() => {
      const current = containerRef.current;
      if (current) {
        current.scrollTop =
          current.scrollHeight - previousHeight + previousTop;
      }
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    });
  }, [comments.length, hasMore, loadPage]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (container.scrollTop <= LOAD_MORE_THRESHOLD_PX) {
      void loadMore();
    }
  }, [loadMore]);

  useEffect(() => {
    hasAutoScrolledRef.current = false;
    shouldScrollToBottomRef.current = false;
    setComments([]);
    setTotal(0);
    void reload({ scrollToBottom: true, showLoading: true });
  }, [scopeKey, reload]);

  useEffect(() => {
    let isCancelled = false;
    let unsubscribe: (() => void) | undefined;

    const subscribe = async () => {
      await ensureAppwriteInitialized();
      const databaseId = getRuntimeDatabaseId();
      if (!databaseId || isCancelled) return;

      unsubscribe = databases.client.subscribe(
        `databases.${databaseId}.collections.${COMMENTS_COLLECTION}.documents`,
        (response) => {
          try {
            const event = response.events[0] || "";
            const incoming = mapComment(response.payload as any);
            if (!matchesScope(incoming, stableScope)) return;

            if (event.includes("create")) {
              const container = containerRef.current;
              const isNearBottom = container
                ? container.scrollHeight - container.scrollTop - container.clientHeight < 120
                : true;
              void reload({ scrollToBottom: isNearBottom });
              return;
            }

            void reload();
          } catch (error) {
            console.warn("Failed to process paginated comment realtime event:", error);
          }
        }
      );
    };

    void subscribe();

    return () => {
      isCancelled = true;
      try {
        unsubscribe?.();
      } catch {}
    };
  }, [reload, stableScope]);

  useEffect(() => {
    if (isInitialLoading) return;
    if (!hasAutoScrolledRef.current || shouldScrollToBottomRef.current) {
      scrollToBottom();
      hasAutoScrolledRef.current = true;
      shouldScrollToBottomRef.current = false;
    }
  }, [comments, isInitialLoading, scrollToBottom]);

  const threadData = useMemo(() => buildThreadData(comments), [comments]);

  return {
    comments,
    commentMap: threadData.commentMap,
    rootComments: threadData.rootComments,
    containerRef,
    hasMore,
    isInitialLoading,
    isLoadingMore,
    reload,
    handleScroll,
  };
}
