'use client';
import { GameCard } from "@/components/GameCard";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Game, GameTag } from "@shared/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Gamepad2, Clock } from "lucide-react";
const mockHoursByGenre: { name: GameTag, hours: number }[] = [
    { name: 'RPG', hours: 450 },
    { name: 'Action', hours: 300 },
    { name: 'Shooter', hours: 150 },
    { name: 'Indie', hours: 200 },
    { name: 'Strategy', hours: 80 },
    { name: 'Adventure', hours: 120 },
];
export function LibraryPage() {
  const { data: gamesResponse, isLoading, isError } = useQuery({
    queryKey: ['games'],
    queryFn: () => api<{ items: Game[] }>('/api/games'),
  });
  const userLibrary = gamesResponse?.items ?? [];
  const totalHours = mockHoursByGenre.reduce((sum, genre) => sum + genre.hours, 0);
  if (isError) {
    return <div className="text-center text-red-500">Failed to load your library. Please try again later.</div>;
  }
  return (
    <div className="animate-fade-in space-y-12">
      <section>
        <h1 className="font-orbitron text-4xl font-black text-blood-500 mb-8">My Library</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="card-glass">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-300">Total Games</CardTitle>
                    <Gamepad2 className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">{isLoading ? <Skeleton className="h-10 w-20" /> : userLibrary.length}</div>
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
                        <BarChart data={mockHoursByGenre} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
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
        <h2 className="font-orbitron text-3xl font-bold text-blood-500 mb-6">All Games</h2>
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