import { Game } from "@shared/types";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
interface GameCardProps {
  game: Game;
  variant?: 'store' | 'library';
}
export function GameCard({ game, variant = 'store' }: GameCardProps) {
  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.03 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="group relative overflow-hidden rounded-lg shadow-lg bg-void-800 border border-void-700"
    >
      <Link to={`/game/${game.slug}`} className="block">
        <div className="aspect-[3/4] relative">
          <img
            src={game.coverImage}
            alt={game.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="font-orbitron text-lg font-bold truncate">{game.title}</h3>
          <div className="flex gap-1 mt-1 flex-wrap">
            {game.tags.slice(0, 2).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs bg-void-700 text-gray-300">{tag}</Badge>
            ))}
          </div>
        </div>
      </Link>
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {variant === 'store' ? (
          <Button size="sm" className="bg-blood-500 hover:bg-blood-600 text-white shadow-blood-glow">
            ${game.price}
          </Button>
        ) : (
          <Button size="sm" className="bg-blood-500 hover:bg-blood-600 text-white shadow-blood-glow">
            Play
          </Button>
        )}
      </div>
    </motion.div>
  );
}