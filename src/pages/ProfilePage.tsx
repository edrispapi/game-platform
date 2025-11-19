import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Trophy, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Game, UserProfile, Order } from "@shared/types";
import { Skeleton } from "@/components/ui/skeleton";
import { GameCard } from "@/components/GameCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
function OrderHistory() {
  const { data: ordersResponse, isLoading, isError } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api<{ items: Order[] }>('/api/orders'),
  });
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (isError || !ordersResponse) {
    return <p className="text-center text-red-500">Failed to load order history.</p>;
  }
  const orders = ordersResponse.items;
  return (
    <Card className="bg-void-800 border-void-700">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Items</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map(order => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">{order.id.split('-')[0]}</TableCell>
                <TableCell>{format(new Date(order.createdAt), 'PPP')}</TableCell>
                <TableCell>${order.total.toFixed(2)}</TableCell>
                <TableCell>{order.items.map(item => item.title).join(', ')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
export function ProfilePage() {
  const { data: profile, isLoading: isLoadingProfile, isError: isProfileError } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: () => api('/api/profile'),
  });
  const { data: gamesResponse, isLoading: isLoadingGames } = useQuery({
    queryKey: ['games'],
    queryFn: () => api<{ items: Game[] }>('/api/games'),
  });
  const favoriteGames = gamesResponse?.items.filter(game => profile?.favoriteGames.includes(game.slug)) ?? [];
  if (isLoadingProfile) {
    return (
      <div className="space-y-8">
        <Card className="bg-void-800 border-void-700">
          <CardContent className="p-6 flex items-center gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-64" />
              <div className="flex gap-4 mt-4">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (isProfileError || !profile) {
    return <div className="text-center text-red-500">Failed to load profile. Please try again later.</div>;
  }
  return (
    <div className="animate-fade-in space-y-8">
      <Card className="bg-void-800 border-void-700">
        <CardContent className="p-6 flex items-center gap-6">
          <Avatar className="h-24 w-24 border-4 border-blood-500">
            <AvatarImage src={profile.avatar} alt={profile.username} />
            <AvatarFallback>{profile.username.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-orbitron font-bold">{profile.username}</h1>
            <p className="text-gray-400 mt-1">{profile.bio}</p>
            <div className="flex gap-4 mt-4">
              <Badge variant="secondary" className="bg-void-700 text-gray-300 py-1 px-3">
                <Clock className="mr-2 h-4 w-4" /> {profile.hoursPlayed} Hours Played
              </Badge>
              <Badge variant="secondary" className="bg-void-700 text-gray-300 py-1 px-3">
                <Trophy className="mr-2 h-4 w-4" /> {profile.achievementsCount} Achievements
              </Badge>
              <Badge variant="secondary" className="bg-void-700 text-gray-300 py-1 px-3">
                <Users className="mr-2 h-4 w-4" /> {profile.friendsCount} Friends
              </Badge>
            </div>
          </div>
          <Button className="ml-auto bg-void-700 hover:bg-void-600">Edit Profile</Button>
        </CardContent>
      </Card>
      <Tabs defaultValue="favorites" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-void-800 border-void-700">
          <TabsTrigger value="favorites">Favorite Games</TabsTrigger>
          <TabsTrigger value="orders">Order History</TabsTrigger>
        </TabsList>
        <TabsContent value="favorites" className="py-6">
          <Card className="bg-void-800 border-void-700">
            <CardContent className="p-6">
              {isLoadingGames ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)}
                </div>
              ) : favoriteGames.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {favoriteGames.map(game => <GameCard key={game.id} game={game} />)}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-10">No favorite games selected yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="orders" className="py-6">
          <OrderHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}