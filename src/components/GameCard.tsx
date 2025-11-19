import { Game } from "@shared/types";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
interface GameCardProps {
  game: Game;
  variant?: 'store' | 'library';
}
export function GameCard({ game, variant = 'store' }: GameCardProps) {
  const averageRating = game.reviews.length > 0
    ? game.reviews.reduce((acc, r) => acc + r.rating, 0) / game.reviews.length
    : 4.5; // Default rating for demo
  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="group relative overflow-hidden rounded-lg card-glass transition-all duration-300 hover:shadow-neon-red"
    >
      <Link to={`/game/${game.slug}`} className="block">
        <div className="aspect-[3/4] relative">
          <img
            src={game.coverImage}
            alt={game.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>
      </Link>
      <div className="p-4">
        <h3 className="font-orbitron text-lg font-bold truncate text-white">{game.title}</h3>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-bold text-white">{averageRating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({game.reviews.length})</span>
          </div>
          {variant === 'store' && (
            <Badge className="bg-blood-500 text-white font-bold">${game.price}</Badge>
          )}
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