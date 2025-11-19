import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Achievement, AchievementRarity } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
const rarityStyles: Record<AchievementRarity, string> = {
  Common: "bg-gray-500/20 text-gray-300 border-gray-500",
  Rare: "bg-blue-500/20 text-blue-300 border-blue-500",
  Epic: "bg-purple-500/20 text-purple-300 border-purple-500",
  Legendary: "bg-yellow-500/20 text-yellow-300 border-yellow-500",
};
export function AchievementsPage() {
  const { data: achievementsResponse, isLoading, isError } = useQuery({
    queryKey: ["achievements"],
    queryFn: () => api<{ items: Achievement[] }>("/api/achievements"),
  });
  const achievements = achievementsResponse?.items ?? [];
  if (isError) {
    return <div className="text-center text-red-500">Failed to load achievements.</div>;
  }
  return (
    <div className="animate-fade-in">
      <h1 className="font-orbitron text-4xl font-black text-blood-500 mb-8">Achievements</h1>
      <TooltipProvider>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-void-800 p-4 rounded-lg border border-void-700 flex flex-col items-center gap-2">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))
            : achievements.map((ach) => (
                <Tooltip key={ach.id} delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div className={cn("bg-void-800 p-4 rounded-lg border border-void-700 text-center transition-all duration-300 hover:border-blood-500/50 hover:shadow-lg hover:shadow-blood-500/10", !ach.unlocked && "opacity-50 grayscale")}>
                      <img src={ach.icon} alt={ach.name} width={80} height={80} className="mx-auto mb-3" />
                      <p className="font-bold text-lg truncate">{ach.name}</p>
                      <Badge className={cn("mt-2 border", rarityStyles[ach.rarity])}>{ach.rarity}</Badge>
                      <Progress value={ach.progress} className="mt-4 h-2 bg-void-700" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-void-700 border-void-600 text-white">
                    <p className="font-bold">{ach.name}</p>
                    <p className="text-sm text-gray-400 max-w-xs">{ach.description}</p>
                    <p className="text-xs mt-2">{ach.unlocked ? "Unlocked" : `Progress: ${ach.progress}%`}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
        </div>
      </TooltipProvider>
    </div>
  );
}