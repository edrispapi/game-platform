import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShoppingCart, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Game } from "@shared/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartStore } from "@/stores/cart-store";
import { toast } from "sonner";
export function GameDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const addToCart = useCartStore(s => s.addToCart);
  const cartItems = useCartStore(s => s.items);
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
        <TabsList className="grid w-full grid-cols-4 bg-void-800 border-void-700">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="requirements">System Requirements</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="py-6 text-lg text-gray-300 leading-relaxed">
          <p>{game.description}</p>
        </TabsContent>
        <TabsContent value="media">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-6">
            {game.screenshots.map((img, idx) => (
              <a href={img} target="_blank" rel="noopener noreferrer" key={idx} className="overflow-hidden rounded-lg group">
                <img src={img} alt={`screenshot ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
              </a>
            ))}
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
            <p className="text-center text-gray-400">No reviews yet.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}