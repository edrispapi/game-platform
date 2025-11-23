'use client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Search, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Friend, Game, FriendRequest, UserProfile } from "@shared/types";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useState } from "react";
import { UserLink } from "@/components/UserLink";
function BlockedUsersTab() {
  const queryClient = useQueryClient();
  const { data: blockedResponse, isLoading, isError } = useQuery({
    queryKey: ['blocked'],
    queryFn: () => api<{ items: UserProfile[] }>('/api/users/blocked'),
  });
  const unblockMutation = useMutation({
    mutationFn: (userId: string) => api('/api/users/unblock', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
    onSuccess: () => {
      toast.success('User unblocked');
      queryClient.invalidateQueries({ queryKey: ['blocked'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to unblock user: ${error.message}`);
    },
  });
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (isError) {
    return <p className="text-center text-red-500">Failed to load blocked users.</p>;
  }
  const blocked = blockedResponse?.items ?? [];
  return (
    <div className="space-y-4">
      {blocked.length > 0 ? blocked.map(user => (
        <div key={user.id} className="flex items-center justify-between p-4 bg-void-800 rounded-lg border border-void-700">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.username.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <UserLink username={user.username} className="font-bold text-lg">
              {user.username}
            </UserLink>
          </div>
          <Button 
            variant="outline" 
            onClick={() => unblockMutation.mutate(user.id)}
            disabled={unblockMutation.isPending}
          >
            Unblock
          </Button>
        </div>
      )) : (
        <p className="text-center text-gray-400 py-10">You haven't blocked any players.</p>
      )}
    </div>
  );
}

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
            <UserLink username={req.fromUsername} className="font-bold text-lg">
              {req.fromUsername}
            </UserLink>
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
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  
  const { data: friendsResponse, isLoading, isError } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api<{ items: Friend[] }>('/api/friends'),
    refetchInterval: 5000, // Poll for status updates every 5 seconds
  });
  const { data: gamesResponse } = useQuery({
    queryKey: ['games'],
    queryFn: () => api<{ items: Game[] }>('/api/games'),
  });
  
  // Search users
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['user-search', searchQuery],
    queryFn: () => api<{ items: UserProfile[] }>(`/api/users/search?q=${encodeURIComponent(searchQuery)}`),
    enabled: searchQuery.length >= 2 && addFriendOpen,
  });
  
  const addFriendMutation = useMutation({
    mutationFn: (username: string) => api('/api/friend-requests/add', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),
    onSuccess: () => {
      toast.success('Friend request sent!');
      setAddFriendOpen(false);
      setSearchQuery('');
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to send friend request: ${error.message}`);
    },
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
              <UserLink username={friend.username} className="font-bold text-lg">
                {friend.username}
              </UserLink>
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
          <Button 
            className="bg-blood-500 hover:bg-blood-600"
            onClick={() => setAddFriendOpen(true)}
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Add Friend
          </Button>
          
          <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
            <DialogContent className="bg-void-800 border-void-700 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-orbitron">Add Friend</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Search for players by username to send a friend request
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    placeholder="Search by username..."
                    className="pl-10 bg-void-700 border-void-600 text-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
                {isSearching && (
                  <div className="flex justify-center py-4">
                    <Skeleton className="h-20 w-full" />
                  </div>
                )}
                {searchQuery.length >= 2 && !isSearching && searchResults?.items && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {searchResults.items.length > 0 ? (
                      searchResults.items.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 bg-void-700 rounded-lg border border-void-600 hover:border-blood-500 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold">{user.username}</p>
                              <p className="text-sm text-gray-400">{user.bio || 'No bio'}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="bg-blood-500 hover:bg-blood-600"
                            onClick={() => addFriendMutation.mutate(user.username)}
                            disabled={addFriendMutation.isPending}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-400 py-4">No users found</p>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setAddFriendOpen(false);
                  setSearchQuery('');
                }}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
          <BlockedUsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}