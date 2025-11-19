'use client';
import { GameCard } from "@/components/GameCard";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Game } from "@shared/types";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="space-y-6"
  >
    <h2 className="font-orbitron text-3xl font-bold text-blood-500">{title}</h2>
    {children}
  </motion.section>
);
export function StorePage() {
  const { data: gamesResponse, isLoading, isError } = useQuery({
    queryKey: ['games'],
    queryFn: () => api<{ items: Game[] }>('/api/games'),
  });
  const allGames = gamesResponse?.items ?? [];
  const featuredGames = allGames.slice(0, 3);
  const topSellers = [...allGames].sort((a, b) => b.price - a.price).slice(0, 5);
  const newReleases = [...allGames].reverse().slice(0, 5);
  if (isError) {
    return <div className="text-center text-red-500">Failed to load games. Please try again later.</div>;
  }
  return (
    <div className="space-y-12 animate-fade-in">
      <Section title="Featured & Recommended">
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
      </Section>
      <Section title="Top Sellers">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)
          ) : (
            topSellers.map((game) => <GameCard key={game.id} game={game} />)
          )}
        </div>
      </Section>
      <Section title="New Releases">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)
          ) : (
            newReleases.map((game) => <GameCard key={game.id} game={game} />)
          )}
        </div>
      </Section>
    </div>
  );
}