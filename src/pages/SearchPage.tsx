'use client';
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Game, GameTag } from "@shared/types";
import { GameCard } from "@/components/GameCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal } from "lucide-react";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
const ALL_TAGS: GameTag[] = ['Action', 'RPG', 'Strategy', 'Indie', 'Shooter', 'Adventure'];
export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [selectedTags, setSelectedTags] = useState<GameTag[]>([]);
  const [priceRange, setPriceRange] = useState<[number]>([60]);
  const [sortOrder, setSortOrder] = useState('relevance');
  const { data: gamesResponse, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['games'],
    queryFn: () => api<{ items: Game[] }>('/api/games'),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000,
  });
  const handleTagChange = (tag: GameTag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };
  const filteredAndSortedGames = useMemo(() => {
    let games = gamesResponse?.items.filter(game =>
      game.title.toLowerCase().includes(query.toLowerCase())
    ) ?? [];
    // Apply filters
    if (selectedTags.length > 0) {
      games = games.filter(game => selectedTags.every(tag => game.tags.includes(tag)));
    }
    games = games.filter(game => game.price <= priceRange[0]);
    // Apply sorting
    switch (sortOrder) {
      case 'price-asc':
        games.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        games.sort((a, b) => b.price - a.price);
        break;
      case 'title-asc':
        games.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    return games;
  }, [gamesResponse, query, selectedTags, priceRange, sortOrder]);
  if (isError) {
    return (
      <div className="text-center py-20">
        <div className="text-red-500 mb-4 text-lg font-bold">Failed to load search results.</div>
        {error && <p className="text-sm text-gray-400 mb-4">{error.message}</p>}
        <Button onClick={() => refetch()} className="bg-blood-500 hover:bg-blood-600">
          Retry
        </Button>
      </div>
    );
  }
  return (
    <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-4 gap-8">
      <aside className="lg:col-span-1">
        <Card className="card-glass sticky top-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Filters & Sort
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-full bg-void-700 border-void-600">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="title-asc">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max Price: ${priceRange[0]}</Label>
              <Slider
                defaultValue={[60]}
                max={60}
                step={1}
                onValueChange={(value) => setPriceRange(value as [number])}
              />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="space-y-2">
                {ALL_TAGS.map(tag => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox id={tag} onCheckedChange={() => handleTagChange(tag)} />
                    <label htmlFor={tag} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {tag}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => {
              setSelectedTags([]);
              setPriceRange([60]);
              setSortOrder('relevance');
            }}>
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      </aside>
      <main className="lg:col-span-3 space-y-8">
        <h1 className="font-orbitron text-4xl font-black text-blood-500">
          Search Results {query && <>for: <span className="text-white">"{query}"</span></>}
        </h1>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)}
          </div>
        ) : filteredAndSortedGames.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 card-glass rounded-lg">
            <Search className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No results found</h2>
            <p className="text-gray-400">Try adjusting your filters or search query.</p>
          </div>
        )}
      </main>
    </div>
  );
}