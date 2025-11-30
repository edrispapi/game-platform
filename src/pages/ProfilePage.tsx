'use client';
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Trophy, Users, X, Gamepad2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Game, UserProfile, Order, Friend } from "@shared/types";
import { Skeleton } from "@/components/ui/skeleton";
import { GameCard } from "@/components/GameCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { AchievementsPage } from "./AchievementsPage";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { UserLink } from "@/components/UserLink";

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
  const [hoursDialogOpen, setHoursDialogOpen] = useState(false);
  const [friendsDialogOpen, setFriendsDialogOpen] = useState(false);
  
  const { data: profile, isLoading: isLoadingProfile, isError: isProfileError } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: () => api('/api/profile'),
  });
  
  const { data: hoursDetails, isLoading: isLoadingHours } = useQuery({
    queryKey: ['profile-hours-details'],
    queryFn: () => api<{ total: number; byGenre: Array<{ genre: string; hours: number }>; topGenre: { genre: string; hours: number } | null }>('/api/profile/hours-details'),
    enabled: hoursDialogOpen,
  });
  
  const { data: friendsDetails, isLoading: isLoadingFriends } = useQuery({
    queryKey: ['profile-friends-details'],
    queryFn: () => api<{ items: Array<{ id: string; username: string; avatar: string; status: string; currentGame: string | null }> }>('/api/profile/friends-details'),
    enabled: friendsDialogOpen,
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
  
  const maxHours = hoursDetails?.byGenre[0]?.hours || 1;
  
  return (
    <div className="animate-fade-in space-y-8">
      <Card className="bg-void-800 border-void-700">
        <CardContent className="p-6 flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-blood-500">
              <AvatarImage src={profile.avatar} alt={profile.username} />
              <AvatarFallback>{profile.username.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            {profile.status && !profile.settings.hideOnlineStatus && (
              <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-void-800 flex items-center justify-center ${
                profile.status === 'Online' ? 'bg-green-500' : 
                profile.status === 'In Game' ? 'bg-blue-500' : 
                profile.status === 'Offline' ? 'bg-orange-500' :
                'bg-gray-500'
              }`} title={profile.status}>
                <div className={`h-2 w-2 rounded-full ${
                  profile.status === 'Online' ? 'bg-green-300' : 
                  profile.status === 'In Game' ? 'bg-blue-300' : 
                  profile.status === 'Offline' ? 'bg-orange-300' :
                  'bg-gray-300'
                }`} />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-orbitron font-bold">{profile.username}</h1>
              {profile.status && !profile.settings.hideOnlineStatus && (
                <Badge variant="outline" className={
                  profile.status === 'Online' ? 'border-green-500 text-green-400' : 
                  profile.status === 'In Game' ? 'border-blue-500 text-blue-400' : 
                  profile.status === 'Offline' ? 'border-orange-500 text-orange-400' :
                  'border-gray-500 text-gray-400'
                }>
                  {profile.status}
                </Badge>
              )}
            </div>
            <p className="text-gray-400 mt-1">{profile.bio}</p>
            <div className="flex gap-4 mt-4">
              <Badge 
                variant="secondary" 
                className="bg-void-700 text-gray-300 py-1 px-3 cursor-pointer hover:bg-void-600 transition-colors"
                onClick={() => setHoursDialogOpen(true)}
              >
                <Clock className="mr-2 h-4 w-4" /> {profile.hoursPlayed} Hours Played
              </Badge>
              <Badge variant="secondary" className="bg-void-700 text-gray-300 py-1 px-3">
                <Trophy className="mr-2 h-4 w-4" /> {profile.achievementsCount} Achievements
              </Badge>
              <Badge 
                variant="secondary" 
                className="bg-void-700 text-gray-300 py-1 px-3 cursor-pointer hover:bg-void-600 transition-colors"
                onClick={() => setFriendsDialogOpen(true)}
              >
                <Users className="mr-2 h-4 w-4" /> {profile.friendsCount} Friends
              </Badge>
            </div>
          </div>
          <Button asChild className="ml-auto bg-void-700 hover:bg-void-600">
            <Link to="/settings">Edit Profile</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Hours Played Dialog */}
      <Dialog open={hoursDialogOpen} onOpenChange={setHoursDialogOpen}>
        <DialogContent className="bg-void-800 border-void-700 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Clock className="h-6 w-6 text-blood-500" />
              Playtime Statistics
            </DialogTitle>
          </DialogHeader>
          {isLoadingHours ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : hoursDetails ? (
            <div className="space-y-6 mt-4">
              <div className="text-center p-6 bg-void-700/50 rounded-lg">
                <div className="text-4xl font-bold text-blood-500 mb-2">{hoursDetails.total || profile.hoursPlayed}</div>
                <div className="text-gray-400">Total Hours Played</div>
                {hoursDetails.topGenre && (
                  <div className="mt-4 text-sm text-gray-500">
                    Most played: <span className="text-blood-500 font-semibold">{hoursDetails.topGenre.genre}</span> ({hoursDetails.topGenre.hours} hrs)
                  </div>
                )}
              </div>
              {hoursDetails.byGenre && hoursDetails.byGenre.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Hours by Genre</h3>
                  {hoursDetails.byGenre.map((item) => (
                    <div key={item.genre} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.genre}</span>
                        <span className="text-gray-400">{item.hours} hours</span>
                      </div>
                      <Progress value={(item.hours / (hoursDetails.total || 1)) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400">Total: {profile.hoursPlayed} hours</p>
                  <p className="text-sm text-gray-500 mt-2">No genre breakdown available. Start playing games to see detailed stats!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              <div className="text-center p-6 bg-void-700/50 rounded-lg">
                <div className="text-4xl font-bold text-blood-500 mb-2">{profile.hoursPlayed}</div>
                <div className="text-gray-400">Total Hours Played</div>
              </div>
              <p className="text-gray-400 text-center py-4">No genre breakdown available. Start playing games to see detailed stats!</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Friends Dialog */}
      <Dialog open={friendsDialogOpen} onOpenChange={setFriendsDialogOpen}>
        <DialogContent className="bg-void-800 border-void-700 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Users className="h-6 w-6 text-blood-500" />
              Friends ({profile.friendsCount})
            </DialogTitle>
          </DialogHeader>
          {isLoadingFriends ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : friendsDetails && friendsDetails.items.length > 0 ? (
            <div className="space-y-3 mt-4">
              {friendsDetails.items.map((friend) => (
                <Card key={friend.id} className="bg-void-700 border-void-600">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={friend.avatar} />
                      <AvatarFallback>{friend.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <UserLink username={friend.username} className="font-semibold text-lg hover:text-blood-500">
                        {friend.username}
                      </UserLink>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`h-2 w-2 rounded-full ${
                          friend.status === 'Online' ? 'bg-green-500' : 
                          friend.status === 'In Game' ? 'bg-blue-500' : 
                          'bg-gray-500'
                        }`} />
                        <span className="text-sm text-gray-400">
                          {friend.status}
                          {friend.currentGame && ` • Playing ${friend.currentGame}`}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/user/${friend.username}`}>View Profile</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : profile.friendsCount > 0 ? (
            <div className="space-y-3 mt-4">
              <p className="text-gray-400 text-center py-4">
                You have {profile.friendsCount} friend{profile.friendsCount !== 1 ? 's' : ''}. Details are loading...
              </p>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No friends yet. Start adding friends to see them here!</p>
          )}
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="favorites" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-void-800 border-void-700">
          <TabsTrigger value="favorites">Favorite Games</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
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
        <TabsContent value="achievements" className="py-6">
          <AchievementsPage />
        </TabsContent>
        <TabsContent value="orders" className="py-6">
          <OrderHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
