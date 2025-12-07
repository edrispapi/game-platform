'use client';
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { achievementsApi } from "@/lib/api-client";
import { AchievementRarity } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Trophy, Lock, Unlock, Sparkles } from "lucide-react";
const rarityStyles: Record<AchievementRarity, string> = {
  Common: "bg-gray-500/20 text-gray-300 border-gray-500",
  Rare: "bg-blue-500/20 text-blue-300 border-blue-500",
  Epic: "bg-purple-500/20 text-purple-300 border-purple-500",
  Legendary: "bg-yellow-500/20 text-yellow-300 border-yellow-500",
};
type StatusFilter = "all" | "unlocked" | "locked";

export function AchievementsPage() {
  const [rarityFilter, setRarityFilter] = useState<AchievementRarity | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Always default to an empty array so we don't crash before data loads
  const { data: achievements = [], isLoading, isError } = useQuery({
    queryKey: ["achievements"],
    queryFn: () => achievementsApi.list(),
  });

  const stats = useMemo(() => {
    if (!achievements || achievements.length === 0) {
      return { total: 0, unlocked: 0, completion: 0 };
    }
    const unlocked = achievements.filter((a) => a.unlocked).length;
    return {
      total: achievements.length,
      unlocked,
      completion: Math.round((unlocked / achievements.length) * 100),
    };
  }, [achievements]);

  const filtered = useMemo(() => {
    return (achievements || []).filter((ach) => {
      if (rarityFilter !== "all" && ach.rarity !== rarityFilter) return false;
      if (statusFilter === "unlocked" && !ach.unlocked) return false;
      if (statusFilter === "locked" && ach.unlocked) return false;
      return true;
    });
  }, [achievements, rarityFilter, statusFilter]);

  if (isError) {
    return <div className="text-center text-red-500">Failed to load achievements.</div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Simple header – focus on awards / points */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blood-500 to-crimson-600 shadow-blood-glow">
            <Trophy className="h-6 w-6 text-yellow-300" />
          </div>
          <div>
            <h1 className="font-orbitron text-2xl md:text-3xl font-black text-blood-100">
              Awards & Stickers
            </h1>
            <p className="text-sm text-gray-400">
              Cosmetic badges, point-shop rewards and gifts you&apos;ve unlocked or purchased.
            </p>
          </div>
        </div>
      </div>

      <TooltipProvider>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-void-800 p-4 rounded-xl border border-void-700 flex flex-col items-center gap-2"
                >
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))
            : filtered.map((ach) => (
                <Tooltip key={ach.id} delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "bg-void-800/90 p-4 rounded-xl border border-void-700 text-center transition-all duration-300 hover:border-blood-500/60 hover:shadow-lg hover:shadow-blood-500/15",
                        !ach.unlocked && "opacity-60 grayscale"
                      )}
                    >
                      <img
                        src={ach.icon}
                        alt={ach.name}
                        width={80}
                        height={80}
                        className="mx-auto mb-3 rounded-full border border-void-600 bg-void-900 object-contain"
                      />
                      <p className="font-semibold text-sm truncate">{ach.name}</p>
                      <Badge className={cn("mt-2 border text-[0.65rem] px-2 py-0.5", rarityStyles[ach.rarity])}>
                        {ach.rarity}
                      </Badge>
                      <Progress value={ach.progress} className="mt-4 h-2 bg-void-700" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-void-700 border-void-600 text-white max-w-xs">
                    <p className="font-bold flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-300" />
                      {ach.name}
                    </p>
                    <p className="text-sm text-gray-300 mt-1">{ach.description}</p>
                    <p className="text-xs mt-2 text-gray-400">
                      {ach.unlocked ? "Unlocked" : `Progress: ${ach.progress}%`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
        </div>
      </TooltipProvider>
    </div>
  );
}