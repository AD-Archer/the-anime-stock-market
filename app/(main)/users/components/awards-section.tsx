"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Award, Star, Crown, Target, Users, TrendingUp, MessageSquare, Coins } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Award as AwardType, AwardType as AwardTypeEnum } from "@/lib/types";
import { awardDefinitions } from "@/lib/award-definitions";
import { useToast } from "@/hooks/use-toast";

const getIcon = (iconName: string) => {
  switch (iconName) {
    case "coins":
      return Coins;
    case "trophy":
      return Trophy;
    case "award":
      return Award;
    case "star":
      return Star;
    case "crown":
      return Crown;
    case "target":
      return Target;
    case "users":
      return Users;
    case "trending-up":
      return TrendingUp;
    case "message-square":
      return MessageSquare;
    default:
      return Award;
  }
};

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case "common":
      return "bg-gray-100 text-gray-800";
    case "rare":
      return "bg-blue-100 text-blue-800";
    case "epic":
      return "bg-purple-100 text-purple-800";
    case "legendary":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

type AwardsSectionProps = {
  awards: AwardType[];
  isOwnProfile?: boolean;
};

export function AwardsSection({ awards, isOwnProfile = false }: AwardsSectionProps) {
  const { redeemAward } = useStore();
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const { toast } = useToast();

  const unlockedAwardTypes = new Set(awards.map((a) => a.type));
  const allAwardTypes = Object.keys(awardDefinitions) as AwardTypeEnum[];
  const unlockedCount = unlockedAwardTypes.size;
  const totalCount = allAwardTypes.length;

  const handleRedeem = async (awardId: string) => {
    setRedeeming(awardId);
    try {
      const ok = await redeemAward(awardId);
      toast({
        title: ok ? "Reward claimed" : "Could not claim reward",
        description: ok
          ? "Your balance has been updated."
          : "Make sure you're signed in and claiming your own achievement.",
        variant: ok ? "default" : "destructive",
      });
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Awards
        </CardTitle>
        <CardDescription>
          Achievements unlocked: {unlockedCount} / {totalCount}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {awards.length === 0 ? (
          <p className="text-sm text-muted-foreground">No awards unlocked yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {awards
              .sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime())
              .map((award) => {
                const definition = awardDefinitions[award.type];
                if (!definition) return null;
                const Icon = getIcon(definition.icon);
                return (
                  <div
                    key={award.id}
                    className="rounded-lg border p-4 space-y-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <Icon className="h-8 w-8 text-primary" />
                      <Badge className={getRarityColor(definition.rarity)}>
                        {definition.rarity}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="font-semibold">{definition.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {definition.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Unlocked {award.unlockedAt.toLocaleDateString()}
                      </p>
                      {definition.redeemableValue ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          Worth ${definition.redeemableValue}
                        </p>
                      ) : null}
                      {definition.redeemableValue && !award.redeemed && (
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() => handleRedeem(award.id)}
                          disabled={!isOwnProfile || redeeming === award.id}
                        >
                          <Coins className="h-3 w-3 mr-1" />
                          {!isOwnProfile
                            ? "View only"
                            : redeeming === award.id
                              ? "Redeeming..."
                              : `Redeem $${definition.redeemableValue}`}
                        </Button>
                      )}
                      {award.redeemed && (
                        <Badge variant="secondary" className="mt-2">
                          Redeemed
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {unlockedCount < totalCount && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-semibold mb-3">Available Awards</h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {allAwardTypes
                .filter((type) => !unlockedAwardTypes.has(type))
                .map((type) => {
                  const definition = awardDefinitions[type];
                  const Icon = getIcon(definition.icon);
                  return (
                    <div
                      key={type}
                      className="rounded-lg border p-3 space-y-2 opacity-60"
                    >
                      <div className="flex items-start justify-between">
                        <Icon className="h-6 w-6 text-muted-foreground" />
                        <Badge variant="outline" className={getRarityColor(definition.rarity)}>
                          {definition.rarity}
                        </Badge>
                      </div>
                      <div>
                        <h5 className="font-medium text-sm">{definition.name}</h5>
                        <p className="text-xs text-muted-foreground">
                          {definition.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
