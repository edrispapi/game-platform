'use client';
import { GameCard } from "@/components/GameCard";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Game, GameTag } from "@shared/types";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { ArrowRight, Search, Filter, SlidersHorizontal, Star, Calendar, Users } from "lucide-react";
import { useState, useMemo } from "react";
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<GameTag | 'all'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'price-asc' | 'price-desc' | 'newest' | 'rating'>('popular');
  const [priceRange, setPriceRange] = useState<[number]>([100]);
  
  const { data: gamesResponse, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['games'],
    queryFn: () => api<{ items: Game[] }>('/api/games'),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const allGames = gamesResponse?.items ?? [];
  
  const filteredAndSortedGames = useMemo(() => {
    let filtered = allGames.filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = selectedTag === 'all' || game.tags.includes(selectedTag);
      const matchesPrice = game.price <= priceRange[0];
      return matchesSearch && matchesTag && matchesPrice;
    });
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'newest':
          // Assuming games are ordered by creation (newest first in array)
          return allGames.indexOf(b) - allGames.indexOf(a);
        case 'rating':
          const aRating = a.reviews.length > 0 
            ? a.reviews.reduce((sum, r) => sum + r.rating, 0) / a.reviews.length 
            : 0;
          const bRating = b.reviews.length > 0 
            ? b.reviews.reduce((sum, r) => sum + r.rating, 0) / b.reviews.length 
            : 0;
          return bRating - aRating;
        case 'popular':
        default:
          // Sort by number of reviews (popularity indicator)
          return b.reviews.length - a.reviews.length;
      }
    });
    
    return filtered;
  }, [allGames, searchQuery, selectedTag, sortBy, priceRange]);
  
  const featuredGames = allGames.slice(0, 3);
  const topSellers = [...allGames].sort((a, b) => b.price - a.price).slice(0, 5);
  const newReleases = [...allGames].reverse().slice(0, 5);
  if (isError) {
    return (
      <div className="text-center py-20">
        <div className="text-red-500 mb-4 text-lg font-bold">Failed to load games. Please try again later.</div>
        {error && <p className="text-sm text-gray-400 mb-4">{error.message}</p>}
        <Button onClick={() => refetch()} className="bg-blood-500 hover:bg-blood-600">
          Retry
        </Button>
      </div>
    );
  }
  const allTags: GameTag[] = ['Action', 'RPG', 'Strategy', 'Indie', 'Shooter', 'Adventure'];
  
  return (
    <div className="space-y-12 animate-fade-in">
      {/* Filters and Search */}
      <div className="bg-void-800 border border-void-700 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal className="h-5 w-5 text-blood-500" />
          <h3 className="font-orbitron text-xl font-bold text-blood-500">Filters & Sort</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search games..."
              className="pl-10 bg-void-700 border-void-600"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={selectedTag} onValueChange={(v) => setSelectedTag(v as GameTag | 'all')}>
            <SelectTrigger className="bg-void-700 border-void-600">
              <SelectValue placeholder="All Tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="bg-void-700 border-void-600">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Max Price: ${priceRange[0]}</label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={priceRange[0]}
              onChange={(e) => setPriceRange([Number(e.target.value)])}
              className="w-full"
            />
          </div>
        </div>
        {filteredAndSortedGames.length !== allGames.length && (
          <div className="text-sm text-gray-400">
            Showing {filteredAndSortedGames.length} of {allGames.length} games
          </div>
        )}
      </div>
      
      <Section title="Featured & Recommended">
        {isLoading ? (
          <Skeleton className="w-full aspect-video rounded-lg" />
        ) : featuredGames.length > 0 ? (
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
        ) : (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">No featured games available</p>
          </div>
        )}
      </Section>
      <Section title="Top Sellers">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)
          ) : topSellers.length > 0 ? (
            topSellers.map((game) => <GameCard key={game.id} game={game} />)
          ) : (
            <div className="col-span-full text-center py-10 text-gray-400">
              <p>No top sellers available</p>
            </div>
          )}
        </div>
      </Section>
      <Section title="New Releases">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)
          ) : newReleases.length > 0 ? (
            newReleases.map((game) => <GameCard key={game.id} game={game} />)
          ) : (
            <div className="col-span-full text-center py-10 text-gray-400">
              <p>No new releases available</p>
            </div>
          )}
        </div>
      </Section>
      <Section title="All Games">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)
          ) : filteredAndSortedGames.length > 0 ? (
            filteredAndSortedGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))
          ) : (
            <div className="col-span-full text-center py-20 text-gray-400">
              <p className="text-lg mb-2">No games found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}