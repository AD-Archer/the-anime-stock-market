"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import { useStore } from "@/lib/store";
import { Report, CommentSnapshot, User } from "@/lib/types";

type ThreadNode = CommentSnapshot & { replies: ThreadNode[] };
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react";

export function ReportManagement() {
  const { reports, resolveReport, reopenReport, getReports, comments, users } =
    useStore();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolution, setResolution] = useState<"dismiss" | "ban" | "warn">(
    "dismiss"
  );
  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach((user) => map.set(user.id, user));
    return map;
  }, [users]);

  useEffect(() => {
    void getReports();
  }, [getReports]);

  const getThreadContext = useCallback(
    (report: Report): CommentSnapshot[] => {
      if (report.contentType === "message") return [];
      if (report.threadContext && report.threadContext.length > 0) {
        return report.threadContext;
      }
      const commentMap = new Map(comments.map((c) => [c.id, c]));
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

      const rootId = findRootId(report.commentId);
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
    },
    [comments]
  );

  const handleResolveReport = async () => {
    if (!selectedReport) return;

    await resolveReport(selectedReport.id, resolution);
    setSelectedReport(null);
    setResolution("dismiss");
  };

  const getReasonBadgeColor = (reason: Report["reason"]) => {
    switch (reason) {
      case "spam":
        return "bg-yellow-500";
      case "harassment":
        return "bg-red-500";
      case "inappropriate":
        return "bg-orange-500";
      case "nsfw":
        return "bg-purple-500";
      case "spoiler":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBadgeColor = (status: Report["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "resolved":
        return "bg-green-500";
      case "dismissed":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const buildThreadTree = (snapshots: CommentSnapshot[]): ThreadNode[] => {
    const map = new Map<string, ThreadNode>();
    snapshots.forEach((snapshot) => {
      map.set(snapshot.id, { ...snapshot, replies: [] });
    });
    const roots: ThreadNode[] = [];
    map.forEach((node) => {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.replies.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortNodes = (nodes: ThreadNode[]) => {
      nodes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      nodes.forEach((child) => sortNodes(child.replies));
    };

    sortNodes(roots);
    return roots;
  };

  const renderThreadNodes = (
    nodes: ThreadNode[],
    highlightId: string,
    level = 0
  ): ReactNode =>
    nodes.map((node) => (
      <div key={node.id} className={`${level > 0 ? "ml-4" : ""} mb-3`}>
        <div
          className={`rounded border p-3 ${
            node.id === highlightId ? "border-primary" : "border-border"
          } bg-card`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{userMap.get(node.userId)?.username || "Unknown"}</span>
            <span>{node.timestamp.toLocaleString()}</span>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {node.content}
          </p>
          {node.tags && node.tags.length > 0 && (
            <div className="mt-2 flex gap-2">
              {node.tags.map((tag) => (
                <Badge
                  key={`${node.id}-${tag}`}
                  variant={tag === "nsfw" ? "destructive" : "secondary"}
                >
                  {tag.toUpperCase()}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {node.replies.length > 0 &&
          renderThreadNodes(node.replies, highlightId, level + 1)}
      </div>
    ));

  const pendingReports = reports.filter((r) => r.status === "pending");
  const resolvedReports = reports.filter((r) => r.status !== "pending");
  const selectedThread = useMemo<ThreadNode[]>(() => {
    if (!selectedReport || selectedReport.contentType === "message") return [];
    const context = getThreadContext(selectedReport);
    return buildThreadTree(context);
  }, [selectedReport, getThreadContext]);

  const getReportContent = (report: Report) =>
    report.contentType === "message"
      ? report.messageContent
      : report.commentContent;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Reports
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReports.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Resolved Reports
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedReports.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Pending Reports</h3>
        {pendingReports.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No pending reports</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingReports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getReasonBadgeColor(report.reason)}>
                        {report.reason}
                      </Badge>
                      <Badge className={getStatusBadgeColor(report.status)}>
                        {report.status}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReport(report)}
                    >
                      Review
                    </Button>
                  </div>
                  <CardDescription>
                    Reported on{" "}
                    {new Date(report.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p>
                      <strong>Report ID:</strong> {report.id}
                    </p>
                    <p>
                      <strong>Content:</strong>{" "}
                      <span className="text-sm text-muted-foreground">
                        {getReportContent(report) || "Unavailable"}
                      </span>
                    </p>
                    {report.description && (
                      <p>
                        <strong>Description:</strong> {report.description}
                      </p>
                    )}
                    <p>
                      <strong>Content Type:</strong>{" "}
                      {report.contentType || "comment"}
                    </p>
                    {report.commentId && (
                      <p>
                        <strong>Comment ID:</strong> {report.commentId}
                      </p>
                    )}
                    {report.messageId && (
                      <p>
                        <strong>Message ID:</strong> {report.messageId}
                      </p>
                    )}
                    <p>
                      <strong>Reported User ID:</strong> {report.reportedUserId}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <h3 className="text-lg font-semibold">Resolved Reports</h3>
        {resolvedReports.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No resolved reports</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {resolvedReports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getReasonBadgeColor(report.reason)}>
                        {report.reason}
                      </Badge>
                      <Badge className={getStatusBadgeColor(report.status)}>
                        {report.status}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void reopenReport(report.id)}
                    >
                      Reopen
                    </Button>
                  </div>
                  <CardDescription>
                    Reported on{" "}
                    {new Date(report.createdAt).toLocaleDateString()}
                    {report.resolvedAt &&
                      ` • Resolved on ${new Date(
                        report.resolvedAt
                      ).toLocaleDateString()}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p>
                      <strong>Report ID:</strong> {report.id}
                    </p>
                    <p>
                      <strong>Content:</strong>{" "}
                      <span className="text-sm text-muted-foreground">
                        {getReportContent(report) || "Unavailable"}
                      </span>
                    </p>
                    {report.description && (
                      <p>
                        <strong>Description:</strong> {report.description}
                      </p>
                    )}
                    <p>
                      <strong>Content Type:</strong>{" "}
                      {report.contentType || "comment"}
                    </p>
                    {report.commentId && (
                      <p>
                        <strong>Comment ID:</strong> {report.commentId}
                      </p>
                    )}
                    {report.messageId && (
                      <p>
                        <strong>Message ID:</strong> {report.messageId}
                      </p>
                    )}
                    <p>
                      <strong>Reported User ID:</strong> {report.reportedUserId}
                    </p>
                    {report.resolution && (
                      <p>
                        <strong>Resolution:</strong> {report.resolution}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={!!selectedReport}
        onOpenChange={() => setSelectedReport(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
            <DialogDescription>
              Review and resolve this report
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p>
                  <strong>Reason:</strong> {selectedReport.reason}
                </p>
                <p>
                  <strong>Report ID:</strong> {selectedReport.id}
                </p>
                {selectedReport.description && (
                  <p>
                    <strong>Description:</strong> {selectedReport.description}
                  </p>
                )}
                <p>
                  <strong>Content Type:</strong>{" "}
                  {selectedReport.contentType || "comment"}
                </p>
                {selectedReport.commentId && (
                  <p>
                    <strong>Comment ID:</strong> {selectedReport.commentId}
                  </p>
                )}
                {selectedReport.messageId && (
                  <p>
                    <strong>Message ID:</strong> {selectedReport.messageId}
                  </p>
                )}
                <p>
                  <strong>Reported User ID:</strong>{" "}
                  {selectedReport.reportedUserId}
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  Original{" "}
                  {selectedReport.contentType === "message"
                    ? "Message"
                    : "Comment"}
                </Label>
                <p className="rounded bg-muted p-3 text-sm text-foreground">
                  {getReportContent(selectedReport) || "Unavailable"}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Thread Context</Label>
                {selectedReport.contentType === "message" ||
                selectedThread.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No additional context available.
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto pr-2">
                    {renderThreadNodes(
                      selectedThread,
                      selectedReport.commentId || ""
                    )}
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="resolution">Resolution</Label>
                <Select
                  value={resolution}
                  onValueChange={(value) =>
                    setResolution(value as typeof resolution)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dismiss">Dismiss Report</SelectItem>
                    <SelectItem value="warn">Warn User</SelectItem>
                    <SelectItem value="ban">Ban User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReport(null)}>
              Cancel
            </Button>
            <Button onClick={handleResolveReport}>Resolve Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
