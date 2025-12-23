"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { BuyDialog } from "@/app/(main)/character/components/buy-dialog";
import { MarketOverview } from "@/components/market-overview";
import { TopStocksSection } from "./components/top-stocks-section";
import { MarketDiscussion } from "./components/market-discussion";
import { Comment, ContentTag } from "@/lib/types";
import { StockCard } from "@/components/stock-card";
import { useRouter } from "next/navigation";

export default function TradingPage() {
  const { stocks, currentUser, addComment, editComment, deleteComment, getMarketComments, users, reportComment, toggleCommentReaction } = useStore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);

  // Sort stocks by market cap (price * total shares) descending
  const sortedStocks = [...stocks].sort((a, b) =>
    (b.currentPrice * b.totalShares) - (a.currentPrice * a.totalShares)
  );

  // Top 10 best selling characters
  const topStocks = sortedStocks.slice(0, 10);

  const filteredStocks = sortedStocks.filter(
    (stock) =>
      stock.characterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.anime.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const marketComments = getMarketComments();

  const handleAddComment = async (content: string, tags: ContentTag[]) => {
    await addComment({
      content,
      tags,
    });
  };

  const handleAddReply = async (parentId: string, content: string, tags?: ContentTag[]) => {
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

  const handleReportComment = async (commentId: string, reason: string, description?: string) => {
    await reportComment(commentId, reason as any, description);
  };

  const handleBuy = (stockId: string) => {
    if (!currentUser) {
      router.push('/auth/signin');
    } else {
      setSelectedStockId(stockId);
    }
  };

  return (
    <div className="bg-background">
      {/* Header moved to app layout */}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <MarketOverview />
        </div>

        {/* Search Results or Top Characters */}
        {searchQuery ? (
          <div className="mb-8">
            <h3 className="mb-4 text-xl font-semibold text-foreground">
              Search Results ({filteredStocks.length})
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {filteredStocks.map((stock) => (
                <StockCard
                  key={stock.id}
                  stock={stock}
                  onBuy={() => handleBuy(stock.id)}
                />
              ))}
            </div>

            {filteredStocks.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">
                  No stocks found matching your search.
                </p>
              </div>
            )}
          </div>
        ) : (
          <TopStocksSection
            topStocks={topStocks}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onBuy={handleBuy}
          />
        )}

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
