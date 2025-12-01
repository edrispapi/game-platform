'use client';
import React, { useState, useMemo } from "react";
import { GameCard } from "@/components/GameCard";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Game, GameTag } from "@shared/types";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Search, Star, TrendingUp, Clock, DollarSign, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest' | 'price-low' | 'price-high'>('popular');
  const [maxPrice, setMaxPrice] = useState(100);
  
  const { data: gamesResponse, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['games'],
    queryFn: () => api<{ items: Game[] }>('/api/games'),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000,
  });
  
  const allGames = gamesResponse?.items ?? [];
  
  const filteredAndSortedGames = useMemo(() => {
    let filtered = allGames.filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = selectedTag === 'all' || game.tags.includes(selectedTag);
      const matchesPrice = game.price <= maxPrice;
      return matchesSearch && matchesTag && matchesPrice;
    });
    
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'newest':
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
          return b.reviews.length - a.reviews.length;
      }
    });
    
    return filtered;
  }, [allGames, searchQuery, selectedTag, sortBy, maxPrice]);
  
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
  const hasActiveFilters = searchQuery || selectedTag !== 'all' || maxPrice < 100;
  
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTag('all');
    setMaxPrice(100);
    setSortBy('popular');
  };
  
  return (
    <div className="space-y-10 animate-fade-in">
      {/* Clean Filter Bar */}
      <div className="bg-void-800/80 backdrop-blur-sm border border-void-700/50 rounded-2xl p-4 sm:p-5 shadow-[0_0_40px_rgba(255,0,76,0.06)]">
        <div className="flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search games..."
              className="pl-9 h-10 bg-void-900/50 border-void-600 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Genre Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedTag('all')}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                selectedTag === 'all'
                  ? "bg-blood-500 text-white"
                  : "bg-void-700/50 text-gray-400 hover:text-white hover:bg-void-600"
              )}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  selectedTag === tag
                    ? "bg-blood-500 text-white"
                    : "bg-void-700/50 text-gray-400 hover:text-white hover:bg-void-600"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
          
          {/* Sort Buttons */}
          <div className="flex flex-wrap items-center gap-1 bg-void-900/50 rounded-lg p-1">
            <button
              onClick={() => setSortBy('popular')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                sortBy === 'popular' ? "bg-blood-500/20 text-blood-400" : "text-gray-400 hover:text-white"
              )}
            >
              <TrendingUp className="h-3.5 w-3.5" /> Popular
            </button>
            <button
              onClick={() => setSortBy('rating')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                sortBy === 'rating' ? "bg-blood-500/20 text-blood-400" : "text-gray-400 hover:text-white"
              )}
            >
              <Star className="h-3.5 w-3.5" /> Top Rated
            </button>
            <button
              onClick={() => setSortBy('newest')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                sortBy === 'newest' ? "bg-blood-500/20 text-blood-400" : "text-gray-400 hover:text-white"
              )}
            >
              <Clock className="h-3.5 w-3.5" /> New
            </button>
            <button
              onClick={() => setSortBy('price-low')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                sortBy === 'price-low' ? "bg-blood-500/20 text-blood-400" : "text-gray-400 hover:text-white"
              )}
            >
              <DollarSign className="h-3.5 w-3.5" /> Low
            </button>
          </div>
          
          {/* Price Slider */}
          <div className="flex items-center gap-2 min-w-[140px]">
            <span className="text-xs text-gray-500">Max:</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="flex-1 h-1.5 bg-void-600 rounded-full appearance-none cursor-pointer accent-blood-500"
            />
            <span className="text-xs font-mono text-gray-400 w-8">${maxPrice}</span>
          </div>
          
          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors self-start xl:self-auto"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
        
        {/* Results count */}
        {filteredAndSortedGames.length !== allGames.length && (
          <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-void-700/50">
            Showing {filteredAndSortedGames.length} of {allGames.length} games
          </p>
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
