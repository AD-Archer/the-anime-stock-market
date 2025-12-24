import type { StoreApi } from "zustand";
import type { Comment, CommentSnapshot, Notification, Report } from "../types";
import { reportService } from "../database";
import type { StoreState } from "./types";

type StoreMutators = Pick<StoreApi<StoreState>, "setState" | "getState">;

export function createReportActions({
  setState,
  getState,
  buildThreadContext,
  describeCommentLocation,
  deleteComment,
}: StoreMutators & {
  buildThreadContext: (commentId: string) => CommentSnapshot[];
  describeCommentLocation: (
    location?: { animeId: string; characterId?: string } | null
  ) => string;
  deleteComment: (commentId: string) => Promise<void>;
}) {
  const reportComment = async (
    commentId: string,
    reason: Report["reason"],
    description?: string
  ) => {
    const currentUser = getState().currentUser;
    if (!currentUser) return;

    const comment = getState().comments.find((c) => c.id === commentId);
    if (!comment) return;

    const threadContext = buildThreadContext(commentId);
    const commentLocation = {
      animeId: comment.animeId ?? "",
      characterId: comment.characterId,
    };

    try {
      const newReport = await reportService.create({
        reporterId: currentUser.id,
        reportedUserId: comment.userId,
        commentId,
        commentContent: comment.content,
        reason,
        description,
        status: "pending",
        createdAt: new Date(),
        threadContext,
        commentLocation,
      });
      setState((state) => ({ reports: [...state.reports, newReport] }));
    } catch (error) {
      console.warn("Failed to create report:", error);
    }
  };

  const getReports = async (): Promise<Report[]> => {
    try {
      const latestReports = await reportService.getAll();
      const sortedReports = latestReports.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      setState({ reports: sortedReports });
      return sortedReports;
    } catch (error) {
      console.warn("Failed to refresh reports:", error);
      return getState().reports;
    }
  };

  const resolveReport = async (
    reportId: string,
    resolution: "dismiss" | "warn" | "ban"
  ) => {
    const { currentUser, logAdminAction } = getState();
    if (!currentUser || !currentUser.isAdmin) return;

    const targetReport = getState().reports.find((r) => r.id === reportId);
    if (!targetReport) return;

    const status = resolution === "dismiss" ? "dismissed" : "resolved";
    const now = new Date();

    try {
      await reportService.update(reportId, {
        status,
        resolvedAt: now,
        resolvedBy: currentUser.id,
        resolution,
      });
      setState((state) => ({
        reports: state.reports.map((r) =>
          r.id === reportId
            ? {
                ...r,
                status,
                resolvedAt: now,
                resolvedBy: currentUser.id,
                resolution,
              }
            : r
        ),
      }));

      if (resolution === "warn" || resolution === "ban") {
        const location =
          targetReport.commentLocation ||
          (() => {
            const comment = getState().comments.find(
              (c) => c.id === targetReport.commentId
            );
            if (!comment) return undefined;
            return {
              animeId: comment.animeId ?? "",
              characterId: comment.characterId,
            };
          })();

        try {
          await deleteComment(targetReport.commentId);
        } catch (error) {
          console.warn("Failed to auto-delete reported comment:", error);
        }

        const actionVerb = resolution === "ban" ? "banned" : "warned";
        const locationText = describeCommentLocation(location);
        const detail = targetReport.description
          ? `Reason provided: ${targetReport.description}.`
          : "";
        getState().sendNotification(
          targetReport.reportedUserId,
          "moderation",
          `You have been ${actionVerb}`,
          `On ${targetReport.createdAt.toLocaleString()}, your comment in ${locationText} violated our guidelines and has been removed. ${detail} Original message: "${
            targetReport.commentContent || "Unavailable"
          }".`,
          {
            reportId,
            commentId: targetReport.commentId,
            action: resolution,
            location,
          }
        );
      }
    } catch (error) {
      console.warn("Failed to resolve report:", error);
    }
  };

  return {
    reportComment,
    getReports,
    resolveReport,
  };
}
