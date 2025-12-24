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
        contentType: "comment",
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

  const reportMessage = async (
    messageId: string,
    reason: Report["reason"],
    description?: string
  ) => {
    const currentUser = getState().currentUser;
    if (!currentUser) return;

    const message = getState().messages.find((m) => m.id === messageId);
    if (!message) return;

    try {
      const newReport = await reportService.create({
        reporterId: currentUser.id,
        reportedUserId: message.senderId,
        contentType: "message",
        messageId,
        messageContent: message.content,
        reason,
        description,
        status: "pending",
        createdAt: new Date(),
      });
      setState((state) => ({ reports: [...state.reports, newReport] }));
    } catch (error) {
      console.warn("Failed to create message report:", error);
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
          targetReport.contentType === "comment"
            ? targetReport.commentLocation ||
              (() => {
                const comment = getState().comments.find(
                  (c) => c.id === targetReport.commentId
                );
                if (!comment) return undefined;
                return {
                  animeId: comment.animeId ?? "",
                  characterId: comment.characterId,
                };
              })()
            : undefined;

        if (targetReport.contentType !== "message" && targetReport.commentId) {
          try {
            await deleteComment(targetReport.commentId);
          } catch (error) {
            console.warn("Failed to auto-delete reported comment:", error);
          }
        }

        const actionVerb = resolution === "ban" ? "banned" : "warned";
        const locationText =
          targetReport.contentType === "message"
            ? "a direct message"
            : describeCommentLocation(location);
        const detail = targetReport.description
          ? `Reason provided: ${targetReport.description}.`
          : "";
        const originalContent =
          targetReport.contentType === "message"
            ? targetReport.messageContent
            : targetReport.commentContent;
        getState().sendNotification(
          targetReport.reportedUserId,
          "moderation",
          `You have been ${actionVerb}`,
          `On ${targetReport.createdAt.toLocaleString()}, your ${locationText} violated our guidelines and has been removed. ${detail} Original message: "${
            originalContent || "Unavailable"
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

  const reopenReport = async (reportId: string) => {
    const { currentUser, logAdminAction } = getState();
    if (!currentUser || !currentUser.isAdmin) return;

    const targetReport = getState().reports.find((r) => r.id === reportId);
    if (!targetReport) return;

    try {
      await reportService.update(reportId, {
        status: "pending",
        resolvedAt: null,
        resolvedBy: undefined,
        resolution: undefined,
      });
      setState((state) => ({
        reports: state.reports.map((r) =>
          r.id === reportId
            ? {
                ...r,
                status: "pending",
                resolvedAt: undefined,
                resolvedBy: undefined,
                resolution: undefined,
              }
            : r
        ),
      }));

      logAdminAction("ban", targetReport.reportedUserId, {
        action: "report_reopened",
        reportId,
      });
    } catch (error) {
      console.warn("Failed to reopen report:", error);
    }
  };

  return {
    reportComment,
    reportMessage,
    getReports,
    resolveReport,
    reopenReport,
  };
}
