import { Game } from "@shared/types";
import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Play, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { WebGLImage } from "@/components/WebGLImage";
import ReactPlayer from "react-player/youtube";
import { GAME_TRAILERS } from "@shared/trailers";
import { useMutation } from "@tanstack/react-query";
import { shoppingApi, getCurrentUserId } from "@/lib/api-client";
import { toast } from "sonner";

const sanitizeSlug = (value?: string | number | null) => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim().replace(/^\/+|\/+$/g, "");
  return str.length > 0 ? str : null;
};

// Flexible game type that works with both full Game and simplified StoreGame
type GameCardGame = Pick<
  Game,
  'id' | 'slug' | 'title' | 'description' | 'price' | 'coverImage' | 'bannerImage' | 'tags'
> & {
  reviews: Array<{ rating: number }>;
  // Optional precomputed rating and review count from backend (FastAPI)
  rating?: number;
  reviewsCount?: number;
  developer?: string;
  publisher?: string;
  releaseDate?: string;
  screenshots?: string[];
  videos?: string[];
  requirements?: Game['requirements'];
  wishlistCount?: number;
};

interface GameCardProps {
  game: GameCardGame;
  variant?: 'store' | 'library';
  disableVideoPreview?: boolean;
}
export function GameCard({ game, variant = 'store', disableVideoPreview = false }: GameCardProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistItemId, setWishlistItemId] = useState<number | null>(null);

  const wishlistMutation = useMutation({
    mutationFn: async () => {
      const userId = getCurrentUserId();
      if (!userId) {
        throw new Error("Please log in to use wishlist");
      }

      // Fetch or create default wishlist
      const wishlists = await shoppingApi.getWishlists(userId);
      let target = wishlists[0];

      if (!target) {
        target = await shoppingApi.createWishlist(userId, "My Wishlist");
      }

      // If game already exists in wishlist, remove it (toggle)
      const existingItem = (target.items || []).find(
        (item: any) => String(item.game_id) === String(game.id)
      );

      if (existingItem) {
        await shoppingApi.removeFromWishlist(existingItem.id);
        return { action: "removed" as const, itemId: existingItem.id };
      }

      const created = await shoppingApi.addToWishlist(
        target.id,
        String(game.id),
        game.title,
        game.price,
        "USD"
      );
      return { action: "added" as const, itemId: created.id };
    },
    onSuccess: (result) => {
      if (!result) return;
      if (result.action === "added") {
        setIsWishlisted(true);
        setWishlistItemId(result.itemId);
        toast.success("Added to wishlist");
      } else {
        setIsWishlisted(false);
        setWishlistItemId(null);
        toast.success("Removed from wishlist");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update wishlist");
    },
  });

  const tags = Array.isArray(game.tags) ? game.tags : [];
  const reviews = Array.isArray(game.reviews) ? game.reviews : [];

  const hasBackendRating = typeof game.rating === 'number' && game.rating > 0;
  const hasBackendCount = typeof game.reviewsCount === 'number' && game.reviewsCount > 0;

  const derivedAverage =
    reviews.length > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
      : 0;

  const averageRating = hasBackendRating ? game.rating! : derivedAverage;
  const totalReviews = hasBackendCount ? game.reviewsCount! : reviews.length;

  const showRating = averageRating > 0 && totalReviews > 0;

  const explicitTrailer =
    game.videos && game.videos.length > 0 ? game.videos[0] : undefined;
  const fallbackTrailer = GAME_TRAILERS[game.slug as keyof typeof GAME_TRAILERS];
  const trailerUrl = disableVideoPreview ? undefined : (explicitTrailer || fallbackTrailer);

  const showWishlist = variant === "store" || variant === "library";

  const slugSegment =
    sanitizeSlug(game.slug) ||
    sanitizeSlug(game.id) ||
    "game";

  return (
    <motion.div
      whileHover={{ y: -8 }}
      onHoverStart={() => setIsHovering(true)}
      onHoverEnd={() => setIsHovering(false)}
      transition={{ type: "spring", stiffness: 300 }}
      className="group relative overflow-hidden rounded-lg card-glass transition-all duration-300 hover:shadow-neon-red"
    >
      {/* Wishlist button */}
      {showWishlist && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!wishlistMutation.isPending) {
              wishlistMutation.mutate();
            }
          }}
          className={cn(
            "absolute top-3 right-3 z-20 rounded-full p-1.5 border border-white/30 bg-black/60 backdrop-blur-sm transition-colors hover:bg-black/80"
          )}
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              isWishlisted ? "fill-red-500 text-red-500" : "text-white"
            )}
          />
        </button>
      )}

      <Link to={`/game/${slugSegment}`} className="block">
        <div className="aspect-[3/4] relative overflow-hidden">
          <WebGLImage
            src={game.coverImage}
            alt={game.title}
            className={cn(
              "w-full h-full object-cover transition-transform duration-300",
              trailerUrl && isHovering
                ? "group-hover:scale-105 opacity-0"
                : "group-hover:scale-105"
            )}
            fallback={game.bannerImage || "/images/default-cover.svg"}
          />

          {trailerUrl && isHovering && (
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <ReactPlayer
                url={trailerUrl}
                playing
                muted
                loop
                width="100%"
                height="100%"
                style={{ pointerEvents: "none" }}
              />
              {/* Play icon overlay for visual cue */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 via-transparent to-transparent">
                <div className="bg-black/60 rounded-full p-2 border border-white/40">
                  <Play className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          )}

          {!trailerUrl && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          )}
        </div>
      </Link>
      <div className="p-4">
        <Link to={`/game/${slugSegment}`} className="block">
          <h3 className="font-orbitron text-lg font-bold truncate text-white transition-colors hover:text-blood-400 cursor-pointer no-underline">
            {game.title}
          </h3>
        </Link>
        {game.developer && (
          <p className="text-xs text-gray-500 mt-1 truncate">
            {game.developer}{game.publisher && game.publisher !== game.developer ? ` • ${game.publisher}` : ''}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{game.description ? game.description.substring(0, 80) + '...' : 'No description available'}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            <Star className={cn("h-4 w-4", showRating ? "text-yellow-400 fill-yellow-400" : "text-gray-600")} />
            {showRating ? (
              <>
                <span className="text-sm font-bold text-white">{averageRating.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({totalReviews})</span>
              </>
            ) : (
              <span className="text-xs text-gray-400">No reviews yet</span>
            )}
          </div>
          {variant === 'store' && (
            <Badge className="bg-blood-500 text-white font-bold">${game.price}</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.slice(0, 2).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>
      </div>
      <div className={cn(
        "absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        variant === 'library' ? "flex" : "hidden"
      )}>
        <Button size="lg" className="bg-blood-500 hover:bg-blood-600 text-white shadow-blood-glow font-bold text-lg">
          PLAY
        </Button>
      </div>
    </motion.div>
  );
}