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
import { Clock, Trophy, Users, UserPlus, Check, Ban, UserMinus } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GameCard } from "@/components/GameCard";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const queryClient = useQueryClient();
  const [removeFriendDialogOpen, setRemoveFriendDialogOpen] = useState(false);
  const [blockUserDialogOpen, setBlockUserDialogOpen] = useState(false);
  const { data: profile, isLoading: isLoadingProfile, isError: isProfileError } = useQuery<UserProfile>({
    queryKey: ['publicProfile', username],
    queryFn: () => api(`/api/user/${username}`),
    enabled: !!username,
  });
  const { data: gamesResponse, isLoading: isLoadingGames } = useQuery({
    queryKey: ['games'],
    queryFn: () => api<{ items: Game[] }>('/api/games'),
  });
  
  const { data: friendsResponse } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api<{ items: Array<{ id: string; username: string }> }>('/api/friends'),
  });
  
  const isFriend = friendsResponse?.items.some(f => f.id === profile?.id || f.username === profile?.username) || false;
  const addFriendMutation = useMutation({
    mutationFn: (targetUsername: string) => api('/api/friend-requests/add', {
      method: 'POST',
      body: JSON.stringify({ username: targetUsername }),
    }),
    onSuccess: () => {
      toast.success(`Friend request sent to ${profile?.username}!`);
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
    onError: (error) => {
      toast.error(`Failed to send friend request: ${error.message}`);
    },
  });
  
  const removeFriendMutation = useMutation({
    mutationFn: (targetUserId: string) => api('/api/friends/remove', {
      method: 'POST',
      body: JSON.stringify({ userId: targetUserId }),
    }),
    onSuccess: () => {
      toast.success(`${profile?.username} has been removed from your friends.`);
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['publicProfile', username] });
    },
    onError: (error) => {
      toast.error(`Failed to remove friend: ${error.message}`);
    },
  });
  const blockUserMutation = useMutation({
    mutationFn: (targetUserId: string) => api('/api/users/block', {
      method: 'POST',
      body: JSON.stringify({ userId: targetUserId }),
    }),
    onSuccess: () => {
      toast.success(`User ${profile?.username} has been blocked.`);
      queryClient.invalidateQueries({ queryKey: ['blocked'] });
    },
    onError: (error) => {
      toast.error(`Failed to block user: ${error.message}`);
    },
  });
  const handleAddFriend = () => {
    if (profile?.username) {
      addFriendMutation.mutate(profile.username);
    }
  };
  
  const handleRemoveFriend = () => {
    if (profile?.id) {
      setRemoveFriendDialogOpen(true);
    }
  };
  const handleBlockUser = () => {
    if (profile?.id) {
      setBlockUserDialogOpen(true);
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
  
  // Show blocked message
  if (profile.blocked) {
    return (
      <div className="animate-fade-in space-y-8">
        <Card className="bg-void-800 border-void-700">
          <CardContent className="p-12 text-center">
            <Ban className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold text-red-400 mb-2">
              {profile.blockedByMe ? 'You blocked this user' : 'This user blocked you'}
            </h2>
            <p className="text-gray-400">
              {profile.blockedByMe 
                ? `You have blocked ${profile.username}. You cannot view their profile or send messages.`
                : `${profile.username} has blocked you. You cannot view their profile or send messages.`
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
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
                'bg-gray-500'
              }`}>
                <div className={`h-2 w-2 rounded-full ${
                  profile.status === 'Online' ? 'bg-green-300' : 
                  profile.status === 'In Game' ? 'bg-blue-300' : 
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
                  'border-gray-500 text-gray-400'
                }>
                  {profile.status}
                </Badge>
              )}
            </div>
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
          <div className="ml-auto flex gap-2">
            {isFriend ? (
              <Button
                variant="outline"
                className="border-red-500 text-red-400 hover:bg-red-500/20"
                onClick={handleRemoveFriend}
                disabled={removeFriendMutation.isPending}
              >
                <UserMinus className="mr-2 h-4 w-4" /> Remove Friend
              </Button>
            ) : (
              <Button
                className="bg-blood-500 hover:bg-blood-600 disabled:bg-green-600 disabled:opacity-100"
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
            )}
            <Button
              variant="destructive"
              onClick={handleBlockUser}
              disabled={blockUserMutation.isPending}
            >
              <Ban className="mr-2 h-4 w-4" /> Block
            </Button>
          </div>
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

      {/* Remove Friend Dialog */}
      <AlertDialog open={removeFriendDialogOpen} onOpenChange={setRemoveFriendDialogOpen}>
        <AlertDialogContent className="bg-void-800 border-void-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Friend</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to remove <span className="font-semibold text-white">{profile?.username}</span> from your friends? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-void-700 border-void-600 text-gray-300 hover:bg-void-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (profile?.id) {
                  removeFriendMutation.mutate(profile.id);
                  setRemoveFriendDialogOpen(false);
                }
              }}
            >
              Remove Friend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block User Dialog */}
      <AlertDialog open={blockUserDialogOpen} onOpenChange={setBlockUserDialogOpen}>
        <AlertDialogContent className="bg-void-800 border-void-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Block User</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to block <span className="font-semibold text-white">{profile?.username}</span>? You will not be able to see their messages or profile, and they will not be able to contact you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-void-700 border-void-600 text-gray-300 hover:bg-void-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (profile?.id) {
                  blockUserMutation.mutate(profile.id);
                  setBlockUserDialogOpen(false);
                }
              }}
            >
              Block User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}