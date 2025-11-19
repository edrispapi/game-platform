'use client';
import { GameCard } from "@/components/GameCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Game } from "@shared/types";
import { Skeleton } from "@/components/ui/skeleton";
export function LibraryPage() {
  const { data: gamesResponse, isLoading, isError } = useQuery({
    queryKey: ['games'],
    queryFn: () => api<{ items: Game[] }>('/api/games'),
  });
  // For demo, we assume the user owns all available games
  const userLibrary = gamesResponse?.items ?? [];
  if (isError) {
    return <div className="text-center text-red-500">Failed to load your library. Please try again later.</div>;
  }
  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-orbitron text-4xl font-black text-blood-500">My Library</h1>
        <div className="relative w-full max-w-xs">
          <Input placeholder="Search your games..." className="pl-10 bg-void-800 border-void-700 focus:ring-blood-500" />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)}
        </div>
      ) : userLibrary.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {userLibrary.map((game) => (
            <GameCard key={game.id} game={game} variant="library" />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-2">Your library is empty</h2>
          <p className="text-gray-400">Games you purchase will appear here.</p>
        </div>
      )}
    </div>
  );
}