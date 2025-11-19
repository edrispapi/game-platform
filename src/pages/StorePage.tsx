import { GameCard } from "@/components/GameCard";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Game } from "@shared/types";
import { Skeleton } from "@/components/ui/skeleton";
export function StorePage() {
  const { data: gamesResponse, isLoading, isError } = useQuery({
    queryKey: ['games'],
    queryFn: () => api<{ items: Game[] }>('/api/games'),
  });
  const games = gamesResponse?.items ?? [];
  const featuredGames = games.slice(0, 3);
  if (isError) {
    return <div className="text-center text-red-500">Failed to load games. Please try again later.</div>;
  }
  return (
    <div className="space-y-12 animate-fade-in">
      {/* Featured Carousel */}
      <section>
        <h2 className="font-orbitron text-3xl font-bold text-blood-500 mb-6">Featured & Recommended</h2>
        {isLoading ? (
          <Skeleton className="w-full aspect-video rounded-lg" />
        ) : (
          <Carousel opts={{ loop: true }} className="w-full">
            <CarouselContent>
              {featuredGames.map((game) => (
                <CarouselItem key={game.id}>
                  <div className="relative aspect-video rounded-lg overflow-hidden group">
                    <img src={game.bannerImage} alt={game.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-8 text-white">
                      <h3 className="font-orbitron text-4xl font-black">{game.title}</h3>
                      <p className="max-w-xl mt-2 text-gray-300 hidden md:block">{game.description.substring(0, 100)}...</p>
                      <Button asChild className="mt-4 bg-blood-500 hover:bg-blood-600 shadow-blood-glow">
                        <Link to={`/game/${game.slug}`}>View Details</Link>
                      </Button>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </Carousel>
        )}
      </section>
      {/* All Games Grid */}
      <section>
        <h2 className="font-orbitron text-3xl font-bold text-blood-500 mb-6">Browse All Games</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)
          ) : (
            games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}