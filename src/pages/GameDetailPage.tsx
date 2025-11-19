'use client';
import { useParams, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShoppingCart, Check, Star, MessageSquare, Construction } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
const mockReviews: GameReview[] = [
  { id: 'r1', userId: 'u2', username: 'WitcherFan', rating: 5, comment: "Absolutely phenomenal game. A masterpiece of storytelling and open-world design.", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3 },
  { id: 'r2', userId: 'u3', username: 'CyberNinja', rating: 4, comment: "Great atmosphere and fun gameplay, though it had a rocky launch. Much better now!", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 1 },
];
export function GameDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const addToCart = useCartStore(s => s.addToCart);
  const cartItems = useCartStore(s => s.items);
  const [reviews, setReviews] = useState<GameReview[]>(mockReviews);
  const [newReview, setNewReview] = useState({ rating: 0, comment: '' });
  const { data: game, isLoading, isError } = useQuery({
    queryKey: ['game', slug],
    queryFn: () => api<Game>(`/api/games/${slug}`),
    enabled: !!slug,
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
      const review: GameReview = {
        id: `r${reviews.length + 1}`,
        userId: 'user-1',
        username: 'shadcn', // Mock current user
        rating: newReview.rating,
        comment: newReview.comment,
        createdAt: Date.now(),
      };
      setReviews(prev => [review, ...prev]);
      setNewReview({ rating: 0, comment: '' });
      toast.success("Review submitted!");
    } else {
      toast.error("Please provide a rating and a comment.");
    }
  };
  if (isLoading) {
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
  if (isError || !game) {
    return <div className="text-center py-20 text-red-500">Game not found or failed to load.</div>;
  }
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <div className="relative h-[450px] rounded-lg overflow-hidden mb-8">
        <img src={game.bannerImage} alt={game.title} className="w-full h-full object-cover" />
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
            <div>
                <h3 className="font-orbitron text-2xl font-bold mb-4 text-blood-400">Trailer</h3>
                <div className="aspect-video rounded-lg overflow-hidden">
                    <ReactPlayer url={game.videos[0]} width="100%" height="100%" controls />
                </div>
            </div>
            <div>
                <h3 className="font-orbitron text-2xl font-bold mb-4 text-blood-400">Screenshots</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {game.screenshots.map((img, idx) => (
                    <a href={img} target="_blank" rel="noopener noreferrer" key={idx} className="overflow-hidden rounded-lg group">
                        <img src={img} alt={`screenshot ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                    </a>
                    ))}
                </div>
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
              {reviews.map(review => (
                <Card key={review.id} className="bg-void-800 border-void-700">
                  <CardContent className="p-6 flex gap-4">
                    <Avatar>
                      <AvatarImage src={`https://i.pravatar.cc/150?u=${review.userId}`} />
                      <AvatarFallback>{review.username.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold">{review.username}</p>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />)}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">{formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}</p>
                      <p className="mt-2 text-gray-300">{review.comment}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                    <Button type="submit" className="w-full bg-blood-500 hover:bg-blood-600">Submit Review</Button>
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