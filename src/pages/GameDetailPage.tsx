'use client';
import { useParams, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShoppingCart, Check, Star, MessageSquare, Construction, Play, Image as ImageIcon, AlertCircle, Download } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gamesApi, reviewsApi, getCurrentUserId } from "@/lib/api-client";
import type { GameResponse as CatalogGame, ReviewResponse } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartStore } from "@/stores/cart-store";
import { toast } from "sonner";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import ReactPlayer from 'react-player/youtube';
import { UserLink } from "@/components/UserLink";
import { GAME_TRAILERS, getYoutubeThumbnail } from "@shared/trailers";
import { WebGLImage } from "@/components/WebGLImage";
import { CommentReactions } from "@/components/CommentReactions";
import { motion } from "framer-motion";
import type { Game } from "@shared/types";

function mapCatalogGameToGame(apiGame: CatalogGame): Game {
  const tags = (apiGame.tags || []) as any[];

  // pc_requirements is stored in backend JSONB but not surfaced in TS type; treat as any.
  const requirements = (apiGame as any).pc_requirements as any;
  const min = (requirements && requirements.minimum) || {};

  return {
    id: String(apiGame.id),
    slug: apiGame.slug || apiGame.title.toLowerCase().replace(/\s+/g, "-"),
    title: apiGame.title,
    description: apiGame.description || apiGame.short_description || "",
    price: apiGame.price,
    coverImage:
      apiGame.cover_image_url ||
      apiGame.banner_image_url ||
      "/images/default-cover.svg",
    bannerImage:
      apiGame.banner_image_url ||
      "/images/default-banner.svg",
    tags,
    screenshots: apiGame.screenshots || [],
    videos: apiGame.movies || [],
    reviews: [],
    requirements: {
      os: min.os || "",
      processor: min.processor || "",
      memory: min.memory || "",
      graphics: min.graphics || "",
      storage: min.storage || "",
    },
  };
}

// Screenshot Card Component with Error Handling
function ScreenshotCard({ imageUrl, gameTitle, index, fallbackThumbnail }: { 
  imageUrl: string; 
  gameTitle: string; 
  index: number;
  fallbackThumbnail: string | null;
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <Card className="bg-void-800 border-void-700 overflow-hidden group hover:border-blood-500/50 transition-all duration-300 hover:shadow-xl">
      <CardContent className="p-0 relative aspect-video">
        {!imageError ? (
          <>
            <WebGLImage
              src={imageUrl}
              alt={`${gameTitle} screenshot ${index + 1}`}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              fallback={fallbackThumbnail || undefined}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
            {imageLoading && (
              <div className="absolute inset-0 bg-void-700 animate-pulse flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-gray-600 animate-pulse" />
              </div>
            )}
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-4 gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/10 backdrop-blur-sm hover:bg-white/20"
                onClick={() => window.open(imageUrl, '_blank')}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                View Full Size
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/10 backdrop-blur-sm hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  const link = document.createElement('a');
                  link.href = imageUrl;
                  link.download = `${gameTitle}-screenshot-${index + 1}.jpg`;
                  link.target = '_blank';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </>
        ) : (
          // Fallback for broken images
          <div className="w-full h-full flex flex-col items-center justify-center bg-void-700 text-gray-500 p-4">
            <AlertCircle className="h-8 w-8 mb-2 text-gray-600" />
            <p className="text-xs text-center">Image unavailable</p>
            {fallbackThumbnail && (
              <img 
                src={fallbackThumbnail} 
                alt="Fallback thumbnail" 
                className="mt-2 w-full h-full object-cover opacity-50"
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewCard({ review }: { review: ReviewResponse & { username?: string; avatar_url?: string } }) {
  const [expanded, setExpanded] = useState(false);
  const lines = (review.content || "").split('\n');
  const isLong = lines.length > 13 || (review.content || "").length > 800;
  const displayComment = !isLong || expanded
    ? review.content
    : lines.slice(0, 13).join('\n');

  return (
    <CardContent className="p-6 flex gap-4">
      <Avatar>
        <AvatarImage src={review.avatar_url} />
        <AvatarFallback>{(review.username || "U").substring(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <UserLink username={review.username || "Player"} className="font-bold">
            {review.username || "Player"}
          </UserLink>
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
              />
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-500">
          {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, includeSeconds: true })}
        </p>
        <p className="mt-2 text-gray-300 whitespace-pre-wrap break-words">
          {displayComment}
          {isLong && !expanded && (
            <button
              type="button"
              className="ml-2 text-xs text-blood-400 hover:text-blood-300 underline"
              onClick={() => setExpanded(true)}
            >
              Read more
            </button>
          )}
        </p>
        <CommentReactions
          onAwardClick={() => {
            // Placeholder – actual award purchase popup is handled at page level
          }}
        />
      </div>
    </CardContent>
  );
}

export function GameDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const addToCart = useCartStore(s => s.addToCart);
  const cartItems = useCartStore(s => s.items);
  const [newReview, setNewReview] = useState({ rating: 0, comment: '' });
  const [showAllReviews, setShowAllReviews] = useState(false);
  const currentUserId = getCurrentUserId();

  // Fetch game by slug using dedicated endpoint
  const parseNumericId = (value: string | undefined) => {
    if (!value) return null;
    // Match pure numbers or patterns like game-123
    const match = value.match(/(\d+)/);
    return match ? Number(match[1]) : null;
  };

  const { data: game, isLoading: isLoadingGame, isError: isGameError } = useQuery({
    queryKey: ['game-by-slug', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Slug is required');
      const numericId = parseNumericId(slug);

      // Try by slug first
      try {
        return await gamesApi.getBySlug(slug);
      } catch (err) {
        // Fallback: if the slug is actually an id (or contains one), try by id
        if (numericId !== null) {
          try {
            return await gamesApi.getById(numericId);
          } catch (idErr) {
            // swallow and rethrow original if id also fails
          }
        }
        throw err;
      }
    },
    enabled: !!slug,
    retry: 1,
  });

  // Fetch aggregate review stats for this game (dynamic, from review-service)
  const { data: reviewStats } = useQuery({
    queryKey: ['review-stats', game?.id],
    queryFn: async () => {
      try {
        return await reviewsApi.getStatsForGame(String(game!.id));
      } catch (err) {
        console.warn('Review stats failed:', err);
        return null;
      }
    },
    enabled: !!game,
    staleTime: 2 * 60 * 1000,
  });

  const { data: reviews = [], isLoading: isLoadingReviews } = useQuery({
    queryKey: ['reviews', game?.id],
    queryFn: async () => {
      try {
        return await reviewsApi.getForGame(String(game!.id));
      } catch (err) {
        console.warn('Reviews fetch failed:', err);
        return [];
      }
    },
    enabled: !!game,
  });
  const totalReviews = reviewStats?.total_reviews ?? reviews.length ?? 0;
  // Events featured in – currently derived from game metadata if present, otherwise 0
  const eventsFeaturedIn: number =
    (game as any)?.metadata?.events_featured_in ??
    (game as any)?.metadata?.eventsFeaturedIn ??
    0;
  const averageRating =
    reviewStats?.average_rating ??
    (reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0);
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 10);
  const reviewMutation = useMutation({
    mutationFn: (review: { rating: number; comment: string }) =>
      reviewsApi.create({
        game_id: String(game!.id),
        user_id: currentUserId || "",
        rating: review.rating,
        content: review.comment,
        is_recommended: review.rating >= 4,
      }),
    onSuccess: () => {
      toast.success("Review submitted successfully!");
      setNewReview({ rating: 0, comment: '' });
      // Refresh individual reviews and aggregate stats
      queryClient.invalidateQueries({ queryKey: ['reviews', game?.id] });
      queryClient.invalidateQueries({ queryKey: ['review-stats', game?.id] });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.response?.data?.detail || 'Unknown error';
      if (errorMessage.includes('Not authenticated') || errorMessage.includes('Could not validate credentials')) {
        toast.error('Please log in to submit a review.');
      } else if (errorMessage.includes('user_id')) {
        toast.error('User ID is required. Please log in and try again.');
      } else {
        toast.error(`Failed to submit review: ${errorMessage}`);
      }
      console.error('Review submission error:', error);
    },
  });
  const isInCart = game ? cartItems.some(item => item.id === String(game.id)) : false;
  const handleAddToCart = () => {
    if (game) {
      addToCart(mapCatalogGameToGame(game as CatalogGame));
      toast.success(`${game.title} added to cart!`);
    }
  };
  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newReview.rating > 0 && newReview.comment.trim()) {
      reviewMutation.mutate(newReview);
    } else {
      toast.error("Please provide a rating and a comment.");
    }
  };
  if (isLoadingGame) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-[450px] w-full rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-10 w-1/4" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (isGameError || !game) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="max-w-md mx-auto">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-500 mb-2">Game not found</h2>
          <p className="text-gray-400 mb-4">
            {isGameError ? "Failed to load game details." : `Game "${slug}" could not be found.`}
          </p>
          <Button asChild className="bg-blood-500 hover:bg-blood-600">
            <Link to="/store">Go to Store</Link>
          </Button>
        </div>
      </div>
    );
  }
  const fallbackTrailer = slug ? GAME_TRAILERS[slug] : undefined;
  // Prefer backend movies array if present, otherwise fallback to static map
  const trailerUrl =
    (Array.isArray((game as any).movies) && (game as any).movies[0]) || fallbackTrailer;

  // Fallback screenshot: YouTube thumbnail, then banner/cover image
  const getYoutubeThumbnailFromUrl = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
    }
    return null;
  };

  const trailerThumbnail = trailerUrl ? getYoutubeThumbnailFromUrl(trailerUrl) : null;
  const fallbackScreenshot =
    trailerThumbnail ||
    (game as any).banner_image_url ||
    (game as any).cover_image_url ||
    null;

  const screenshots =
    Array.isArray((game as any).screenshots) && (game as any).screenshots.length > 0
      ? ((game as any).screenshots as string[])
      : fallbackScreenshot
      ? [fallbackScreenshot]
      : [];
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <motion.div
        className="relative h-[450px] rounded-lg overflow-hidden mb-8 group"
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Use regular img for hero banner - faster than WebGL for large images */}
        <img
          src={
            // Prefer wide hero/banner images from catalog service
            (game as any).banner_image_url ||
            (game as any).background_image_url ||
            (game as any).cover_image_url ||
            '/images/default-banner.svg'
          }
          alt={game.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="eager"
          decoding="async"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (img.dataset.fallbackApplied) return;
            img.dataset.fallbackApplied = '1';
            img.src = '/images/default-banner.svg';
          }}
        />
        {/* Animated gradient overlay similar to auth/login atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-t from-void-950 via-void-950/60 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-blood-600/10 via-transparent to-blood-600/10 mix-blend-screen opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="absolute bottom-0 left-0 p-8 text-white space-y-3">
          <h1 className="font-orbitron text-4xl sm:text-5xl font-black mb-1 drop-shadow-lg">
            {game.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {game.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-black/40 border border-white/10 text-white backdrop-blur-sm"
              >
                {tag}
              </Badge>
            ))}
          </div>
          {totalReviews > 0 && (
            <div className="flex items-center gap-3 text-sm text-gray-200 mt-2">
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/50 border border-blood-400/40 backdrop-blur-sm">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="font-semibold">
                  {averageRating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-300">
                  ({totalReviews.toLocaleString()} reviews)
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="absolute bottom-6 right-6 flex flex-col items-end gap-4">
          {/* Events Featured In */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-void-600/70 backdrop-blur-sm text-xs text-gray-200">
            <span className="font-semibold text-blood-400">Events Featured In</span>
            <span className="px-2 py-0.5 rounded-full bg-blood-500/20 text-blood-300 font-mono">
              {eventsFeaturedIn}
            </span>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="font-orbitron text-3xl font-bold text-white drop-shadow-[0_0_20px_rgba(0,0,0,0.7)]">
              ${game.price}
            </p>
            <Button
              size="lg"
              className="bg-blood-500 hover:bg-blood-600 text-white text-lg font-bold shadow-blood-glow disabled:bg-green-600 disabled:opacity-100"
              onClick={handleAddToCart}
              disabled={isInCart}
            >
              {isInCart ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  In Cart
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Add to Cart
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
      {/* Main Content */}
      <Tabs defaultValue="description" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 bg-void-800 border-void-700 h-10 sm:h-9">
          <TabsTrigger value="description" className="text-[11px] sm:text-xs md:text-sm">Description</TabsTrigger>
          <TabsTrigger value="media" className="text-[11px] sm:text-xs md:text-sm">Media</TabsTrigger>
          <TabsTrigger value="requirements" className="text-[11px] sm:text-xs md:text-sm text-center px-1">
            System Requirements
          </TabsTrigger>
          <TabsTrigger value="reviews" className="text-[11px] sm:text-xs md:text-sm">Reviews</TabsTrigger>
          <TabsTrigger value="forum" className="text-[11px] sm:text-xs md:text-sm">Forum</TabsTrigger>
          <TabsTrigger value="workshop" className="text-[11px] sm:text-xs md:text-sm">Workshop</TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="py-6 text-lg text-gray-300 leading-relaxed">
          <p>{game.description}</p>
        </TabsContent>
        <TabsContent value="media" className="py-6 space-y-8">
            {/* Trailer Section - Modern Design */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Play className="h-6 w-6 text-blood-500" />
                    <h3 className="font-orbitron text-2xl font-bold text-blood-400">Game Trailer</h3>
                </div>
                {trailerUrl ? (
                    <Card className="bg-void-800 border-void-700 overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300">
                        <CardContent className="p-0">
                            <div className="relative aspect-video bg-gradient-to-br from-void-900 to-void-950">
                                {/* YouTube Thumbnail Background */}
                                {trailerThumbnail && (
                                    <div className="absolute inset-0 opacity-20">
                                        <img 
                                            src={trailerThumbnail} 
                                            alt="Trailer thumbnail" 
                                            className="w-full h-full object-cover blur-sm"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}
                                
                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-void-950 via-void-900/50 to-transparent" />
                                
                                {/* Video Player */}
                                <div className="relative z-10 w-full h-full">
                        <ReactPlayer 
                            url={trailerUrl} 
                            width="100%" 
                            height="100%" 
                            controls
                                        playing={false}
                                        light={false}
                                        playIcon={
                                            <div className="flex items-center justify-center w-full h-full">
                                                <div className="bg-blood-500/90 hover:bg-blood-500 rounded-full p-6 transition-all duration-300 hover:scale-110 shadow-lg cursor-pointer">
                                                    <Play className="h-12 w-12 text-white ml-1" fill="currentColor" />
                                                </div>
                                            </div>
                                        }
                            onError={(error) => {
                                console.error('Video player error:', error);
                                toast.error('Failed to load trailer video');
                            }}
                                    />
                                </div>
                                
                                {/* Decorative Corner Accents */}
                                <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-blood-500/30" />
                                <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-blood-500/30" />
                    </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="bg-void-800 border-void-700 border-dashed">
                        <CardContent className="aspect-video flex items-center justify-center">
                            <div className="text-center space-y-3">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-void-700 mb-4">
                                    <Play className="h-8 w-8 text-gray-500" />
                                </div>
                                <p className="text-lg font-semibold text-gray-400">No trailer available</p>
                            <p className="text-sm text-gray-500">Trailer video will be available soon</p>
                        </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Screenshots Section - Modern Grid with Error Handling */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <ImageIcon className="h-6 w-6 text-blood-500" />
                    <h3 className="font-orbitron text-2xl font-bold text-blood-400">Screenshots</h3>
                    {screenshots.length > 0 && (
                        <Badge variant="secondary" className="ml-2">{screenshots.length}</Badge>
                    )}
                </div>
              {screenshots.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {screenshots.map((img, idx) => (
                        <ScreenshotCard 
                      key={idx}
                          imageUrl={img}
                          gameTitle={game.title}
                          index={idx}
                          fallbackThumbnail={trailerThumbnail && idx === 0 ? trailerThumbnail : null}
                        />
                  ))}
                </div>
              ) : (
                    <Card className="bg-void-800 border-void-700 border-dashed">
                        <CardContent className="py-16">
                            <div className="text-center space-y-3">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-void-700 mb-4">
                                    <ImageIcon className="h-8 w-8 text-gray-500" />
                                </div>
                                <p className="text-lg font-semibold text-gray-400">No screenshots available</p>
                    <p className="text-sm text-gray-500">Screenshots will be available soon</p>
                  </div>
                        </CardContent>
                    </Card>
              )}
            </div>
        </TabsContent>
        <TabsContent value="requirements" className="py-6">
          <Accordion type="single" collapsible className="w-full" defaultValue="requirements">
            <AccordionItem value="requirements" className="border-void-700">
              <AccordionTrigger className="text-xl font-orbitron hover:no-underline">
                Minimum System Requirements
              </AccordionTrigger>
              <AccordionContent>
                {(() => {
                  // Get requirements from API response (pc_requirements is a JSONB field)
                  const apiGame = game as any;
                  const pcReq = apiGame.pc_requirements?.minimum;
                  
                  if (!pcReq || (typeof pcReq === 'object' && Object.keys(pcReq).length === 0)) {
                    return (
                      <p className="text-gray-500 text-sm">
                        System requirements are not available for this game yet.
                      </p>
                    );
                  }
                  
                  const os = pcReq.os || '';
                  const processor = pcReq.processor || '';
                  const memory = pcReq.memory || '';
                  const graphics = pcReq.graphics || '';
                  const storage = pcReq.storage || '';
                  const directx = pcReq.directx || '';
                  
                  if (!os && !processor && !memory && !graphics && !storage) {
                    return (
                      <p className="text-gray-500 text-sm">
                        System requirements are not available for this game yet.
                      </p>
                    );
                  }
                  
                  return (
                    <ul className="list-disc pl-5 space-y-2 text-gray-400">
                      {os && (
                        <li>
                          <strong>OS:</strong> {os}
                        </li>
                      )}
                      {processor && (
                        <li>
                          <strong>Processor:</strong> {processor}
                        </li>
                      )}
                      {memory && (
                        <li>
                          <strong>Memory:</strong> {memory}
                        </li>
                      )}
                      {graphics && (
                        <li>
                          <strong>Graphics:</strong> {graphics}
                        </li>
                      )}
                      {directx && (
                        <li>
                          <strong>DirectX:</strong> {directx}
                        </li>
                      )}
                      {storage && (
                        <li>
                          <strong>Storage:</strong> {storage}
                        </li>
                      )}
                    </ul>
                  );
                })()}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>
        <TabsContent value="reviews" className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              {isLoadingReviews ? (
                Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)
              ) : reviews.length > 0 ? (
                visibleReviews.map(review => (
                  <Card key={review.id} className="bg-void-800 border-void-700">
                    <ReviewCard review={review} />
                  </Card>
                ))
              ) : (
                <p className="text-center text-gray-400 py-10">No reviews yet. Be the first to write one!</p>
              )}
            </div>
            <div>
              <Card className="bg-void-800 border-void-700 sticky top-24">
                <CardHeader>
                  <CardTitle>Write a Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div>
                      <Label>Your Rating</Label>
                      <div className="flex gap-1 mt-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-8 w-8 cursor-pointer transition-colors ${i < newReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`}
                            onClick={() => setNewReview(s => ({ ...s, rating: i + 1 }))}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="comment">Your Review</Label>
                      <Textarea
                        id="comment"
                        placeholder="Share your thoughts..."
                        className="mt-2 bg-void-700 border-void-600"
                        value={newReview.comment}
                        onChange={(e) => setNewReview(s => ({ ...s, comment: e.target.value }))}
                      />
                    </div>
                    <Button type="submit" className="w-full bg-blood-500 hover:bg-blood-600" disabled={reviewMutation.isPending}>
                      {reviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
              {/* Pagination / show all */}
              {totalReviews > 10 && (
                <p className="mt-4 text-xs text-gray-500 text-center">
                  Showing {visibleReviews.length} of {totalReviews} reviews ·{' '}
                  <button
                    type="button"
                    className="text-blood-400 hover:text-blood-300 underline"
                    onClick={() => setShowAllReviews(true)}
                  >
                    Browse all {totalReviews} reviews
                  </button>
                </p>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="forum" className="py-6 text-center">
            <Button asChild size="lg" className="bg-blood-500 hover:bg-blood-600">
                <Link to={`/game/${slug}/forum`}>
                    <MessageSquare className="mr-2 h-5 w-5" /> Go to Forum
                </Link>
            </Button>
        </TabsContent>
        <TabsContent value="workshop" className="py-6 text-center">
            <Button asChild size="lg" className="bg-blood-500 hover:bg-blood-600">
                <Link to={`/game/${slug}/workshop`}>
                    <Construction className="mr-2 h-5 w-5" /> Go to Workshop
                </Link>
            </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}