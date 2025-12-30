"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { BuyDialog } from "@/app/(main)/character/components/buy-dialog";
import { StockBrowser } from "./components/stock-browser";
import { MarketOverview } from "@/components/market-overview";
import { MarketDiscussion } from "./components/market-discussion";
import { ContentTag } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function TradingPage() {
  const {
    stocks,
    currentUser,
    addComment,
    editComment,
    deleteComment,
    getMarketComments,
    users,
    reportComment,
    toggleCommentReaction,
  } = useStore();
  const router = useRouter();
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);

  const marketComments = getMarketComments();

  const handleAddComment = async (content: string, tags: ContentTag[]) => {
    await addComment({
      content,
      tags,
    });
  };

  const handleAddReply = async (
    parentId: string,
    content: string,
    tags?: ContentTag[]
  ) => {
    await addComment({
      content,
      parentId,
      tags,
    });
  };

  const handleEditComment = async (commentId: string, content: string) => {
    await editComment(commentId, content);
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId);
  };

  const handleReportComment = async (
    commentId: string,
    reason: string,
    description?: string
  ) => {
    await reportComment(commentId, reason as any, description);
  };

  const handleBuy = (stockId: string) => {
    if (!currentUser) {
      router.push("/auth/signin");
    } else {
      setSelectedStockId(stockId);
    }
  };

  return (
    <div className="bg-background">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Market Chart */}
        <div className="mb-12">
          <MarketOverview />
        </div>

        {/* Stock Browser - Main Trading Interface */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Browse & Trade
          </h2>
          <StockBrowser stocks={stocks} onBuy={handleBuy} />
        </div>

        {/* Community Discussion */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Market Discussion
          </h2>
          <MarketDiscussion
            currentUser={currentUser}
            marketComments={marketComments}
            users={users}
            onAddComment={handleAddComment}
            onAddReply={handleAddReply}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
            onReportComment={handleReportComment}
            onToggleReaction={toggleCommentReaction}
          />
        </div>
      </main>

      {/* Buy Dialog */}
      {selectedStockId && (
        <BuyDialog
          stockId={selectedStockId}
          onClose={() => setSelectedStockId(null)}
        />
      )}
    </div>
  );
}
