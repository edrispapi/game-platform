'use client';
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Game, UserProfile } from "@shared/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Trophy, Users, UserPlus, Check } from "lucide-react";
import { GameCard } from "@/components/GameCard";
import { toast } from "sonner";
export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { data: profile, isLoading: isLoadingProfile, isError: isProfileError } = useQuery<UserProfile>({
    queryKey: ['publicProfile', username],
    queryFn: () => api(`/api/user/${username}`),
    enabled: !!username,
  });
  const { data: gamesResponse, isLoading: isLoadingGames } = useQuery({
    queryKey: ['games'],
    queryFn: () => api<{ items: Game[] }>('/api/games'),
  });
  const addFriendMutation = useMutation({
    mutationFn: (targetUsername: string) => api('/api/friend-requests/add', {
      method: 'POST',
      body: JSON.stringify({ username: targetUsername }),
    }),
    onSuccess: () => {
      toast.success(`Friend request sent to ${profile?.username}!`);
    },
    onError: (error) => {
      toast.error(`Failed to send friend request: ${error.message}`);
    },
  });
  const handleAddFriend = () => {
    if (profile?.username) {
      addFriendMutation.mutate(profile.username);
    }
  };
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
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (isProfileError || !profile) {
    return <div className="text-center py-20 text-red-500">User profile not found.</div>;
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
          <Button
            className="ml-auto bg-blood-500 hover:bg-blood-600 disabled:bg-green-600 disabled:opacity-100"
            onClick={handleAddFriend}
            disabled={addFriendMutation.isPending || addFriendMutation.isSuccess}
          >
            {addFriendMutation.isSuccess ? (
              <>
                <Check className="mr-2 h-4 w-4" /> Request Sent
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" /> Add Friend
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      <div>
        <h2 className="font-orbitron text-2xl font-bold text-blood-500 mb-4">Favorite Games</h2>
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
              <p className="text-gray-400 text-center py-10">{profile.username} hasn't selected any favorite games yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}