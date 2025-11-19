import { MOCK_GAMES } from "@shared/mock-data";
import { GameCard } from "@/components/GameCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
export function LibraryPage() {
  // For demo, we assume the user owns all mock games
  const userLibrary = MOCK_GAMES;
  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-orbitron text-4xl font-black text-blood-500">My Library</h1>
        <div className="relative w-full max-w-xs">
          <Input placeholder="Search your games..." className="pl-10 bg-void-800 border-void-700 focus:ring-blood-500" />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>
      </div>
      {userLibrary.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {userLibrary.map((game) => (
            <GameCard key={game.id} game={game} variant="library" />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-2">Your library is empty</h2>
          <p className="text-gray-400">Games you purchase will appear here.</p>
        </div>
      )}
    </div>
  );
}