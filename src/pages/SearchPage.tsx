'use client';
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Game } from "@shared/types";
import { GameCard } from "@/components/GameCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const { data: gamesResponse, isLoading, isError } = useQuery({
    queryKey: ['games'],
    queryFn: () => api<{ items: Game[] }>('/api/games'),
  });
  const filteredGames = gamesResponse?.items.filter(game =>
    game.title.toLowerCase().includes(query.toLowerCase())
  ) ?? [];
  if (isError) {
    return <div className="text-center text-red-500">Failed to load search results.</div>;
  }
  return (
    <div className="animate-fade-in space-y-8">
      <h1 className="font-orbitron text-4xl font-black text-blood-500">
        Search Results for: <span className="text-white">"{query}"</span>
      </h1>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)}
        </div>
      ) : filteredGames.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 card-glass rounded-lg">
          <Search className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No results found</h2>
          <p className="text-gray-400">We couldn't find any games matching "{query}".</p>
        </div>
      )}
    </div>
  );
}