'use client';
import { useMemo } from "react";
import { GameCard } from "@/components/GameCard";
import { useQuery, useQueries } from "@tanstack/react-query";
import { shoppingApi, getCurrentUserId, gamesApi, reviewsApi } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Clock, Heart } from "lucide-react";
import { UserHoursByGenre } from "@shared/types";

export function LibraryPage() {
  const userId = getCurrentUserId();
  const { data: wishlists, isLoading: isLoadingWishlist, isError, error, refetch } = useQuery({
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
  const totalHours = hoursByGenre.reduce((sum, item) => sum + item.hours, 0);

  const wishlistItems = (wishlists?.[0]?.items ?? []) as any[];
  const wishlistCount = Array.isArray(wishlistItems) ? wishlistItems.length : 0;

  const wishlistIds = useMemo(
    () =>
      Array.from(
        new Set(
          (Array.isArray(wishlistItems) ? wishlistItems : [])
            .map((item: any) => item.game_id ?? item.id)
            .filter(Boolean)
            .map(String)
        )
      ),
    [wishlistItems]
  );

  const { data: wishlistDetails = [] } = useQuery({
    queryKey: ['wishlist-details', userId, wishlistIds],
    enabled: !!userId && wishlistIds.length > 0,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const items = Array.isArray(wishlistItems) ? wishlistItems : [];
      const results = await Promise.all(
        items.map(async (item: any) => {
          const id = item.game_id ?? item.id;
          const slug = item.game_slug || item.slug;

          if (id) {
            try {
              return await gamesApi.getById(Number(id));
            } catch (err) {
              console.warn('Wishlist detail by id failed, trying slug', id, slug, err);
            }
          }
          if (slug) {
            try {
              return await gamesApi.getBySlug(String(slug));
            } catch (err) {
              console.warn('Wishlist detail by slug failed', slug, err);
            }
          }
          return null;
        })
      );
      return results.filter(Boolean) as any[];
    },
  });

  const reviewStatsQueries = useQueries({
    queries: wishlistIds.map((id) => ({
      queryKey: ['wishlist-review-stats', id],
      queryFn: async () => {
        try {
          return await reviewsApi.getStatsForGame(String(id));
        } catch (err) {
          return null;
        }
      },
      enabled: !!id,
      staleTime: 2 * 60 * 1000,
      retry: 0,
    })),
  });

  const statsMap = useMemo(() => {
    const map = new Map<string, { rating: number; reviewsCount: number }>();
    reviewStatsQueries.forEach((query, idx) => {
      const id = wishlistIds[idx];
      const data: any = (query as any).data;
      if (!id || !data || typeof data !== 'object') return;
      if ('total_reviews' in data || 'average_rating' in data) {
        map.set(String(id), {
          rating: data.average_rating ?? 0,
          reviewsCount: data.total_reviews ?? 0,
        });
      }
    });
    return map;
  }, [reviewStatsQueries, wishlistIds]);

  const wishlistGames = useMemo(
    () =>
      (Array.isArray(wishlistItems) ? wishlistItems : []).map((item: any) => {
        const detail = wishlistDetails.find(
          (g: any) => String(g.id) === String(item.game_id ?? item.id)
        );
        const stats = statsMap.get(String(item.game_id ?? item.id));

        const title =
          detail?.title ||
          item.game_name ||
          item.title ||
          'Untitled Game';

        const rawSlug =
          item.game_slug ||
          item.slug ||
          detail?.slug ||
          (title ? title.toLowerCase().replace(/\s+/g, "-") : "");

        let slug = (rawSlug || "").replace(/^\/+|\/+$/g, "");
        if (!slug) {
          const idFallback = item.game_id ?? item.id ?? detail?.id;
          slug = idFallback ? `game-${idFallback}` : "game";
        }

        const safeSlug = slug || "game";

        // Prefer catalog/store images first to match Store page visuals; fallback to wishlist-provided images
        const cover =
          detail?.cover_image_url ||
          detail?.banner_image_url ||
          (detail as any)?.header_image_url ||
          item.image_url ||
          item.thumbnail_url ||
          item.cover_image_url ||
          item.banner_image_url ||
          "/images/default-cover.svg";

        const banner =
          detail?.banner_image_url ||
          (detail as any)?.header_image_url ||
          item.banner_image_url ||
          item.image_url ||
          cover;

        return {
          id: String(item.game_id ?? item.id ?? detail?.id ?? slug ?? title),
          slug: safeSlug,
          title,
          description:
            item.description ||
            item.short_description ||
            detail?.description ||
            detail?.short_description ||
            "",
          price:
            detail?.price ??
            item.price ??
            item.price_when_added ??
            0,
          coverImage: cover,
          bannerImage: banner,
          tags: Array.isArray(item.tags)
            ? item.tags
            : Array.isArray(detail?.tags)
              ? detail.tags
              : [],
          reviews: [],
          rating: stats?.rating ?? detail?.average_rating ?? detail?.rating ?? 0,
          reviewsCount: stats?.reviewsCount ?? detail?.total_reviews ?? detail?.reviews_count ?? 0,
          developer: item.developer || detail?.developer,
          publisher: item.publisher || detail?.publisher,
          releaseDate: item.release_date || detail?.release_date,
        };
      }),
    [wishlistItems, wishlistDetails, statsMap]
  );

  if (isError) {
    return (
      <div className="text-center py-20">
        <div className="text-red-500 mb-4 text-lg font-bold">Failed to load your wishlist. Please try again later.</div>
        {error && <p className="text-sm text-gray-400 mb-4">{(error as Error).message}</p>}
        <Button onClick={() => refetch()} className="bg-blood-500 hover:bg-blood-600">
          Retry
        </Button>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="text-center py-20">
        <h2 className="text-3xl font-bold text-blood-500 mb-3">Sign in to view your wishlist</h2>
        <p className="text-gray-400 mb-4">Your wishlist games will appear here after you log in.</p>
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
                      {isLoadingWishlist ? <Skeleton className="h-10 w-20" /> : wishlistCount}
                    </div>
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
      {isLoadingWishlist ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)}
        </div>
      ) : wishlistGames.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {wishlistGames.map((game) => (
            <GameCard key={game.id} game={game} variant="library" />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 card-glass rounded-lg">
          <h2 className="text-2xl font-bold mb-2">Your wishlist is empty</h2>
          <p className="text-gray-400">Wishlist games will appear here after you add them.</p>
          <Button className="mt-4 bg-blood-500 hover:bg-blood-600" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      )}
    </section>
    </div>
  );
}