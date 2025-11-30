'use client';
import { useParams, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShoppingCart, Check, Star, MessageSquare, Construction, Play, Image as ImageIcon, AlertCircle, Download } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Game, GameReview } from "@shared/types";
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

export function GameDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const addToCart = useCartStore(s => s.addToCart);
  const cartItems = useCartStore(s => s.items);
  const [newReview, setNewReview] = useState({ rating: 0, comment: '' });
  const { data: game, isLoading: isLoadingGame, isError: isGameError } = useQuery({
    queryKey: ['game', slug],
    queryFn: () => api<Game>(`/api/games/${slug}`),
    enabled: !!slug,
  });
  const { data: reviewsResponse, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['reviews', slug],
    queryFn: () => api<{ items: GameReview[] }>(`/api/games/${slug}/reviews`),
    enabled: !!slug,
  });
  const reviews = reviewsResponse?.items ?? [];
  const reviewMutation = useMutation({
    mutationFn: (review: Omit<GameReview, 'id' | 'userId' | 'username' | 'createdAt'>) =>
      api<GameReview>(`/api/games/${slug}/reviews`, {
        method: 'POST',
        body: JSON.stringify(review),
      }),
    onSuccess: () => {
      toast.success("Review submitted successfully!");
      setNewReview({ rating: 0, comment: '' });
      queryClient.invalidateQueries({ queryKey: ['reviews', slug] });
    },
    onError: (error) => {
      toast.error(`Failed to submit review: ${error.message}`);
    },
  });
  const isInCart = game ? cartItems.some(item => item.id === game.id) : false;
  const handleAddToCart = () => {
    if (game) {
      addToCart(game);
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
    return <div className="text-center py-20 text-red-500">Game not found or failed to load.</div>;
  }
  const fallbackTrailer = slug ? GAME_TRAILERS[slug] : undefined;
  const trailerUrl = (game.videos && game.videos[0]) || fallbackTrailer;
  const fallbackScreenshot = trailerUrl ? getYoutubeThumbnail(trailerUrl) : null;
  const screenshots = game.screenshots.length
    ? game.screenshots
    : fallbackScreenshot
      ? [fallbackScreenshot]
      : [];
  
  // Helper to get YouTube thumbnail from URL
  const getYoutubeThumbnailFromUrl = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
    }
    return null;
  };
  
  const trailerThumbnail = trailerUrl ? getYoutubeThumbnailFromUrl(trailerUrl) : null;
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <div className="relative h-[450px] rounded-lg overflow-hidden mb-8">
        <WebGLImage 
          src={game.bannerImage} 
          alt={game.title} 
          className="w-full h-full object-cover"
          fallback={game.coverImage}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-void-950 via-void-950/50 to-transparent" />
        <div className="absolute bottom-0 left-0 p-8 text-white">
          <h1 className="font-orbitron text-5xl font-black mb-2">{game.title}</h1>
          <div className="flex items-center gap-2">
            {game.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="bg-white/10 text-white backdrop-blur-sm">{tag}</Badge>
            ))}
          </div>
        </div>
        <div className="absolute bottom-8 right-8 flex items-center gap-4">
            <p className="font-orbitron text-3xl font-bold text-white">${game.price}</p>
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
      {/* Main Content */}
      <Tabs defaultValue="description" className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-void-800 border-void-700">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="requirements">System Requirements</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="forum">Forum</TabsTrigger>
          <TabsTrigger value="workshop">Workshop</TabsTrigger>
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
                    <AccordionTrigger className="text-xl font-orbitron hover:no-underline">Minimum System Requirements</AccordionTrigger>
                    <AccordionContent>
                        <ul className="list-disc pl-5 space-y-2 text-gray-400">
                            <li><strong>OS:</strong> {game.requirements.os}</li>
                            <li><strong>Processor:</strong> {game.requirements.processor}</li>
                            <li><strong>Memory:</strong> {game.requirements.memory}</li>
                            <li><strong>Graphics:</strong> {game.requirements.graphics}</li>
                            <li><strong>Storage:</strong> {game.requirements.storage}</li>
                        </ul>
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
                reviews.map(review => (
                  <Card key={review.id} className="bg-void-800 border-void-700">
                    <CardContent className="p-6 flex gap-4">
                      <Avatar>
                        <AvatarImage src={review.avatar} />
                        <AvatarFallback>{review.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-4">
                          <UserLink username={review.username} className="font-bold">
                            {review.username}
                          </UserLink>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />)}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">{formatDistanceToNow(new Date(review.createdAt), { addSuffix: true, includeSeconds: true })}</p>
                        <p className="mt-2 text-gray-300">{review.comment}</p>
                      </div>
                    </CardContent>
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