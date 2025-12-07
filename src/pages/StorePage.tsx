'use client';
import React, { useState, useMemo, useRef } from "react";
import { GameCard } from "@/components/GameCard";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useQueries } from "@tanstack/react-query";
import { gamesApi, GameResponse, reviewsApi, type ReviewStatsResponse, authApi, type UserResponse } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Search, Star, TrendingUp, Clock, DollarSign, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { GAME_TRAILERS } from "@shared/trailers";
import { WebGLImage } from "@/components/WebGLImage";

type GameTag = 'Action' | 'RPG' | 'Strategy' | 'Indie' | 'Shooter' | 'Adventure';

// Local Game type for StorePage that matches GameCard expectations
interface StoreGame {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  coverImage: string;
  bannerImage: string;
  tags: GameTag[];
  reviews: { rating: number }[];
  screenshots: string[];
  videos: string[];
  requirements: {
    os: string;
    processor: string;
    memory: string;
    graphics: string;
    storage: string;
  };
  // Additional fields from backend
  rating?: number;
  reviewsCount?: number;
  developer?: string;
  publisher?: string;
  releaseDate?: string;
  wishlistCount?: number;
}

function mapApiGameToGame(apiGame: GameResponse): StoreGame {
  return {
    id: String(apiGame.id),
    slug: apiGame.slug || '',
    title: apiGame.title,
    description: apiGame.description || apiGame.short_description || '',
    price: apiGame.price,
    // Use backend URLs when present; otherwise fall back to safe local placeholders
    coverImage: apiGame.cover_image_url || '/images/default-cover.svg',
    bannerImage: apiGame.banner_image_url || apiGame.cover_image_url || '/images/default-banner.svg',
    tags: (apiGame.tags || []) as GameTag[],
    reviews: [], // Reviews are fetched separately
    screenshots: apiGame.screenshots || [],
    videos: apiGame.movies || [],
    requirements: {
      os: '',
      processor: '',
      memory: '',
      graphics: '',
      storage: '',
    },
    // Pass through only trusted review data; avoid catalog mock counts
    rating: 0,
    reviewsCount: 0,
    developer: apiGame.developer,
    publisher: apiGame.publisher,
    releaseDate: apiGame.release_date,
    wishlistCount: apiGame.metadata?.wishlist_count ?? 0,
  };
}

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
  const dealsScrollRef = useRef<HTMLDivElement | null>(null);

  const heroBanners = [
    {
      title: "Call of Duty: Modern Warfare",
      href: "/game/call-of-duty-modern-warfare",
      image: "https://cdn.imgurl.ir/uploads/l02484_Gemini_Generated_Image_fsbrlyfsbrlyfsbr_1.webp",
    },
    {
      title: "God of War: Ragnarök",
      href: "/game/god-of-war-ragnarok",
      image: "https://cdn.imgurl.ir/uploads/u539789_Gemini_Generated_Image_da9u73da9u73da9u.webp",
    },
    {
      title: "Gaming Live Streaming",
      href: "/store",
      image: "https://cdn.imgurl.ir/uploads/l02484_Gemini_Generated_Image_fsbrlyfsbrlyfsbr_1.webp",
    },
  ];

  // Load user settings for video previews (silently fail if not logged in)
  const { data: currentUser } = useQuery<UserResponse>({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (error) {
        // User not logged in - return undefined, don't throw
        return undefined as any;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const disableVideoPreviews = Boolean(currentUser?.extra_metadata?.disable_video_previews);
  
  // Fetch games from FastAPI (full catalog search)
  const { data: gamesResponse, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['games', searchQuery, selectedTag, sortBy, maxPrice],
    queryFn: () =>
      gamesApi.search(
        {
          search: searchQuery || undefined,
          // Backend already supports basic filters; we keep most sorting/filtering client-side
        },
        1,
        50
      ),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch on-sale games
  const { data: onSaleGames } = useQuery({
    queryKey: ['games', 'on-sale'],
    queryFn: async () => {
      try {
        return await gamesApi.getOnSale(5);
      } catch (error) {
        console.warn('Failed to fetch on-sale games:', error);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  
  // Fetch review stats for all games in parallel
  // Only fetch if review-service is available, otherwise use catalog data
  const reviewStatsQueries = useQueries({
    queries: (gamesResponse?.games || []).map((game: any) => ({
      queryKey: ['review-stats', String(game.id)],
      queryFn: async () => {
        try {
          return await reviewsApi.getStatsForGame(String(game.id));
        } catch (error) {
          // If review-service returns 404 or error, return null to use catalog data
          return null;
        }
      },
      enabled: !!game.id,
      staleTime: 2 * 60 * 1000, // 2 minutes
      retry: false, // Don't retry on 404 - game just doesn't have reviews yet
    })),
  });

  // Create a map of game_id -> stats for quick lookup
  // Only use stats if they exist and are valid (not null/undefined)
  const statsMap = useMemo(() => {
    const map = new Map<string, { rating: number; reviewsCount: number }>();
    (reviewStatsQueries as Array<{ data?: ReviewStatsResponse | null }>).forEach((query, index) => {
      const game = gamesResponse?.games?.[index];
      // Only use stats if query succeeded and returned valid data
      if (game && query.data && typeof query.data === 'object' && 'total_reviews' in query.data) {
        map.set(String(game.id), {
          rating: query.data.average_rating ?? 0,
          reviewsCount: query.data.total_reviews ?? 0,
        });
      }
    });
    return map;
  }, [reviewStatsQueries, gamesResponse]);

  const allGames: StoreGame[] = useMemo(() => {
    if (!gamesResponse?.games || !Array.isArray(gamesResponse.games)) {
      return [];
    }
    try {
      return gamesResponse.games.map((game: any) => {
        if (!game || !game.id) return null;
        const stats = statsMap.get(String(game.id));
        const mapped = mapApiGameToGame({
          id: game.id,
          title: game.title || 'Untitled Game',
          description: game.description || game.short_description || '',
          price: game.price || 0,
          developer: game.developer,
          publisher: game.publisher,
          release_date: game.release_date,
          banner_image_url: game.banner_image_url || game.header_image_url,
          cover_image_url: game.cover_image_url || game.capsule_image_url || game.banner_image_url || game.header_image_url,
          // Start with zeroed review data; we'll override with real stats if present
          average_rating: 0,
          total_reviews: 0,
          reviews_count: 0,
          slug: game.slug || game.title?.toLowerCase().replace(/\s+/g, '-') || '',
          tags: [],
          genres: [],
          platforms: [],
        } as GameResponse);
        // Override rating/reviews with review-service stats if available
        if (stats) {
          mapped.rating = stats.rating ?? 0;
          mapped.reviewsCount = stats.reviewsCount ?? 0;
        }
        return mapped;
      }).filter((game): game is StoreGame => game !== null);
    } catch (error) {
      console.error('Error mapping games:', error);
      return [];
    }
  }, [gamesResponse, statsMap]);
  
  const mappedOnSaleGames = useMemo(() => {
    if (!onSaleGames || !Array.isArray(onSaleGames)) return [];
    try {
      return onSaleGames.map(mapApiGameToGame).filter(Boolean);
    } catch (error) {
      console.error('Error mapping on-sale games:', error);
      return [];
    }
  }, [onSaleGames]);
  
  const newestGames = useMemo(() => {
    const withReleaseDate = allGames.filter((game) => Boolean(game.releaseDate));
    const sorted = withReleaseDate.sort((a, b) => {
      const aTime = new Date(a.releaseDate ?? '').getTime();
      const bTime = new Date(b.releaseDate ?? '').getTime();
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
      if (Number.isNaN(aTime)) return 1;
      if (Number.isNaN(bTime)) return -1;
      return bTime - aTime;
    });
    return sorted.slice(0, 5);
  }, [allGames]);
  const newReleaseCandidates = newestGames.length > 0 ? newestGames : allGames.slice(0, 5);
  
  // Derived collections for promo rows
  const goodOldGames = useMemo(() => {
    return allGames.filter((game) => {
      if (!game.releaseDate) return false;
      const year = Number(game.releaseDate.slice(0, 4));
      return !Number.isNaN(year) && year <= 2016;
    }).slice(0, 5);
  }, [allGames]);

  const bestsellers = useMemo(() => {
    const sorted = [...allGames].sort(
      (a, b) => (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0)
    );
    return sorted.slice(0, 10);
  }, [allGames]);
  
  const topWishlisted = useMemo(() => {
    const sorted = [...allGames]
      .filter((g) => (g.wishlistCount ?? 0) > 0)
      .sort((a, b) => (b.wishlistCount ?? 0) - (a.wishlistCount ?? 0));
    return sorted.slice(0, 10);
  }, [allGames]);
  
  if (isError) {
    return (
      <div className="text-center py-20">
        <div className="text-red-500 mb-4 text-lg font-bold">Failed to load games. Please try again later.</div>
        {error && <p className="text-sm text-gray-400 mb-4">{(error as Error).message}</p>}
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
        {gamesResponse && (
          <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-void-700/50">
            Showing {allGames.length} of {gamesResponse.total} games
          </p>
        )}
      </div>
      
      {/* Hero Carousel - Static themed banners */}
      <Section title="Highlights">
        <Carousel opts={{ loop: true }} className="w-full">
          <CarouselContent>
            {heroBanners.map((banner) => (
              <CarouselItem key={banner.href}>
                <Link to={banner.href}>
                  <div className="relative aspect-[16/9] rounded-lg overflow-hidden shadow-2xl">
                    <img
                      src={banner.image}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <h3 className="absolute bottom-4 left-4 font-orbitron text-4xl font-black drop-shadow-md">
                      {banner.title}
                    </h3>
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-4" />
          <CarouselNext className="right-4" />
        </Carousel>
      </Section>
      
      {/* Featured Deals (On Sale) - Horizontal promo row */}
      {mappedOnSaleGames.length > 0 && (
        <Section title="Featured Deals">
          <div className="relative">
            <button
              type="button"
              onClick={() => dealsScrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
              className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full bg-black/70 border border-void-600 text-gray-200 hover:bg-black/90 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => dealsScrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
              className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full bg-black/70 border border-void-600 text-gray-200 hover:bg-black/90 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div
              ref={dealsScrollRef}
              className="bg-void-900/70 border border-void-700 rounded-2xl p-4 overflow-x-auto no-scrollbar"
            >
              <div className="flex gap-4 min-w-full">
                {mappedOnSaleGames.map((game) => (
                  <div key={game.id} className="min-w-[220px] max-w-[240px]">
                    <GameCard game={game} disableVideoPreview={disableVideoPreviews} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>
      )}
      
      {/* Good Old Games - older classics */}
      {goodOldGames.length > 0 && (
        <Section title="Good Old Games">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {goodOldGames.map((game) => (
              <GameCard key={game.id} game={game} disableVideoPreview={disableVideoPreviews} />
            ))}
          </div>
        </Section>
      )}
      
      {/* Bestsellers - sorted by review count */}
      {bestsellers.length > 0 && (
        <Section title="Bestsellers">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {bestsellers.map((game, index) => (
              <div key={game.id} className="relative">
                <span className="absolute -top-2 -left-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-blood-600 text-xs font-bold text-white shadow-md">
                  {index + 1}
                </span>
                <GameCard game={game} disableVideoPreview={disableVideoPreviews} />
              </div>
            ))}
          </div>
        </Section>
      )}
      
      {/* Top Wishlisted - using wishlistCount from metadata */}
      {topWishlisted.length > 0 && (
        <Section title="Top Wishlisted">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {topWishlisted.map((game, index) => (
              <div key={game.id} className="relative">
                <span className="absolute -top-2 -left-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white shadow-md">
                  {index + 1}
                </span>
                <GameCard game={game} disableVideoPreview={disableVideoPreviews} />
              </div>
            ))}
        </div>
      </Section>
      )}
      
      {/* New Releases row */}
      <Section title="New Releases">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)
          ) : newReleaseCandidates.length > 0 ? (
            newReleaseCandidates.map((game: StoreGame) => (
              <GameCard key={game.id} game={game} disableVideoPreview={disableVideoPreviews} />
            ))
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
          ) : allGames.length > 0 ? (
            allGames.map((game) => (
              <GameCard key={game.id} game={game} disableVideoPreview={disableVideoPreviews} />
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
