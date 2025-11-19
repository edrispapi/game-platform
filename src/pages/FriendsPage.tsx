'use client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Friend, Game, FriendRequest } from "@shared/types";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Link } from "react-router-dom";
function FriendRequestsTab() {
  const queryClient = useQueryClient();
  const { data: requestsResponse, isLoading, isError } = useQuery({
    queryKey: ['friend-requests'],
    queryFn: () => api<{ items: FriendRequest[] }>('/api/friend-requests'),
  });
  const handleResponse = (requestId: string, action: 'accept' | 'reject') => {
    return api(`/api/friend-requests/${requestId}/${action}`, { method: 'POST' });
  };
  const mutation = useMutation({
    mutationFn: ({ requestId, action }: { requestId: string, action: 'accept' | 'reject' }) => handleResponse(requestId, action),
    onSuccess: (_, variables) => {
      toast.success(`Friend request ${variables.action}ed.`);
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] }); // Invalidate friends list too
    },
    onError: (_, variables) => {
      toast.error(`Failed to ${variables.action} friend request.`);
    },
  });
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-void-800 rounded-lg border border-void-700">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (isError) {
    return <p className="text-center text-red-500">Failed to load friend requests.</p>;
  }
  const requests = requestsResponse?.items ?? [];
  return (
    <div className="space-y-4">
      {requests.length > 0 ? requests.map(req => (
        <div key={req.id} className="flex items-center justify-between p-4 bg-void-800 rounded-lg border border-void-700">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={req.fromUserAvatar} />
              <AvatarFallback>{req.fromUsername.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <p className="font-bold text-lg">{req.fromUsername}</p>
          </div>
          <div className="flex gap-2">
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => mutation.mutate({ requestId: req.id, action: 'accept' })}>Accept</Button>
            <Button variant="destructive" onClick={() => mutation.mutate({ requestId: req.id, action: 'reject' })}>Decline</Button>
          </div>
        </div>
      )) : (
        <p className="text-center text-gray-400 py-10">No pending friend requests.</p>
      )}
    </div>
  );
}
export function FriendsPage() {
  const { data: friendsResponse, isLoading, isError } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api<{ items: Friend[] }>('/api/friends'),
  });
  const { data: gamesResponse } = useQuery({
    queryKey: ['games'],
    queryFn: () => api<{ items: Game[] }>('/api/games'),
  });
  const friends = friendsResponse?.items ?? [];
  const gamesBySlug = new Map(gamesResponse?.items.map(g => [g.slug, g]));
  const renderFriendList = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-void-800 rounded-lg border border-void-700">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      ));
    }
    if (isError) {
      return <p className="text-center text-red-500">Failed to load friends list.</p>;
    }
    return friends.map(friend => {
      const game = friend.game ? gamesBySlug.get(friend.game) : null;
      return (
        <div key={friend.id} className="flex items-center justify-between p-4 bg-void-800 rounded-lg border border-void-700">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={friend.avatar} />
              <AvatarFallback>{friend.username.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-lg">{friend.username}</p>
              <p className={`text-sm ${friend.status === 'Online' ? 'text-green-400' : 'text-gray-400'}`}>
                {friend.status} {game && `- Playing ${game.title}`}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="border-void-600 hover:bg-void-700">
            <Link to={`/friends/chat/${friend.id}`}>Message</Link>
          </Button>
        </div>
      );
    });
  };
  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-orbitron text-4xl font-black text-blood-500">Social Hub</h1>
        <div className="flex gap-4">
          <div className="relative w-full max-w-xs">
            <Input placeholder="Find players..." className="pl-10 bg-void-800 border-void-700 focus:ring-blood-500" />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
          <Button className="bg-blood-500 hover:bg-blood-600">
            <UserPlus className="mr-2 h-5 w-5" />
            Add Friend
          </Button>
        </div>
      </div>
      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-void-800 border-void-700">
          <TabsTrigger value="friends">All Friends ({friends.length})</TabsTrigger>
          <TabsTrigger value="requests">Friend Requests</TabsTrigger>
          <TabsTrigger value="blocked">Blocked</TabsTrigger>
        </TabsList>
        <TabsContent value="friends" className="py-6">
          <div className="space-y-4">
            {renderFriendList()}
          </div>
        </TabsContent>
        <TabsContent value="requests" className="py-6">
          <FriendRequestsTab />
        </TabsContent>
        <TabsContent value="blocked" className="py-6">
          <p className="text-center text-gray-400 py-10">You haven't blocked any players.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}