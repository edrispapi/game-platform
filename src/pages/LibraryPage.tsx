'use client';
import { GameCard } from "@/components/GameCard";
import { useQuery } from "@tanstack/react-query";
import { gamesApi, shoppingApi, getCurrentUserId } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Clock, Heart } from "lucide-react";
import { UserHoursByGenre } from "@shared/types";
function mapApiGameToLibraryGame(game: any) {
  return {
    id: String(game.id),
    slug: game.slug || game.title?.toLowerCase().replace(/\s+/g, "-") || "",
    title: game.title || "Untitled Game",
    description: game.description || game.short_description || "",
    price: game.price || 0,
    coverImage: game.cover_image_url || game.banner_image_url || "/images/default-cover.svg",
    bannerImage: game.banner_image_url || game.cover_image_url || "/images/default-banner.svg",
    tags: Array.isArray(game.tags) ? game.tags : [],
    reviews: [],
    developer: game.developer,
    publisher: game.publisher,
    releaseDate: game.release_date,
  };
}

export function LibraryPage() {
  const userId = getCurrentUserId();
  const { data: gamesResponse, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['library-games'],
    queryFn: () => gamesApi.search({}, 1, 100),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000,
  });
  const { data: wishlists, isLoading: isLoadingWishlist } = useQuery({
    queryKey: ['wishlists', userId],
    queryFn: async () => {
      if (!userId) return [];
      return shoppingApi.getWishlists(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  // TODO: wire to FastAPI hours-by-genre endpoint when available
  const hoursByGenre: UserHoursByGenre[] = [];

  const userLibrary = (gamesResponse?.games ?? []).map(mapApiGameToLibraryGame);
  const totalHours = hoursByGenre.reduce((sum, item) => sum + item.hours, 0);
  const wishlistItems = (wishlists?.[0]?.items ?? []) as any[];
  const wishlistCount = Array.isArray(wishlistItems) ? wishlistItems.length : 0;
  if (isError) {
    return (
      <div className="text-center py-20">
        <div className="text-red-500 mb-4 text-lg font-bold">Failed to load your library. Please try again later.</div>
        {error && <p className="text-sm text-gray-400 mb-4">{error.message}</p>}
        <Button onClick={() => refetch()} className="bg-blood-500 hover:bg-blood-600">
          Retry
        </Button>
      </div>
    );
  }
  return (
    <div className="animate-fade-in space-y-12">
      <section>
        <h1 className="font-orbitron text-4xl font-black text-blood-500 mb-8">My Library</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="card-glass">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-300">Wishlist</CardTitle>
                    <Heart className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">
                      {isLoadingWishlist
                        ? <Skeleton className="h-10 w-20" />
                        : userId
                          ? wishlistCount
                          : '—'}
                    </div>
                    {!userId && (
                      <p className="text-xs text-gray-500 mt-1">Sign in to view your wishlist</p>
                    )}
                </CardContent>
            </Card>
            <Card className="card-glass">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-300">Total Hours Played</CardTitle>
                    <Clock className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">{totalHours}</div>
                </CardContent>
            </Card>
            <Card className="md:col-span-1 card-glass">
                <CardHeader>
                    <CardTitle className="text-lg font-orbitron">Hours by Genre</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={hoursByGenre.map(item => ({ name: item.genre, hours: item.hours }))} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    border: '1px solid hsl(var(--border))',
                                    color: 'hsl(var(--foreground))'
                                }}
                                cursor={{ fill: 'hsl(var(--primary) / 0.2)' }}
                            />
                            <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
      </section>
    <section>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)}
        </div>
      ) : userLibrary.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {userLibrary.map((game) => (
            <GameCard key={game.id} game={game} variant="library" />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 card-glass rounded-lg">
          <h2 className="text-2xl font-bold mb-2">Your library is empty</h2>
          <p className="text-gray-400">Games you purchase will appear here.</p>
        </div>
      )}
    </section>
    </div>
  );
}