'use client';
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Search, X, Sparkles, Users, Clock, Shuffle, ExternalLink, Gamepad2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, friendsApi, gamesApi, getCurrentUserId, getAuthToken } from "@/lib/api-client";
import { Friend, Game, FriendRequest, UserProfile } from "@shared/types";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { UserLink } from "@/components/UserLink";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getDefaultAvatarForUsername } from "@/config/gameAvatarIcons";

// Modern User Card Component for Add Friend Dialog
function UserCard({ 
  user, 
  onAddFriend, 
  isPending,
  showStats = true,
  hasPendingRequest = false
}: { 
  user: any; 
  onAddFriend: (username: string) => void; 
  isPending: boolean;
  showStats?: boolean;
  hasPendingRequest?: boolean;
}) {
  const navigate = useNavigate();
  
  const statusColors: Record<string, string> = {
    'Online': 'bg-emerald-500',
    'In Game': 'bg-violet-500',
    'Offline': 'bg-gray-500'
  };

  return (
    <div className="group relative">
      {/* Gradient border effect */}
      <div className="absolute -inset-[1px] bg-gradient-to-r from-blood-500/0 via-blood-500/0 to-blood-500/0 group-hover:from-blood-500/50 group-hover:via-crimson-500/50 group-hover:to-blood-500/50 rounded-xl transition-all duration-500 blur-sm" />
      
      <div className="relative flex items-center gap-4 p-4 bg-gradient-to-br from-void-800/90 to-void-900/90 backdrop-blur-sm rounded-xl border border-void-600/50 group-hover:border-blood-500/30 transition-all duration-300">
        {/* Clickable Avatar & Info */}
        <button 
          onClick={() => navigate(`/user/${user.username}`)}
          className="flex items-center gap-4 flex-1 text-left group/profile"
        >
          {/* Avatar with status ring */}
          <div className="relative">
            <div className={cn(
              "absolute -inset-1 rounded-full opacity-0 group-hover/profile:opacity-100 transition-opacity duration-300",
              user.status === 'Online' && "bg-emerald-500/20",
              user.status === 'In Game' && "bg-violet-500/20 animate-pulse",
              user.status === 'Offline' && "bg-gray-500/10"
            )} />
            <Avatar className="h-12 w-12 ring-2 ring-void-600 group-hover/profile:ring-blood-500/50 transition-all duration-300">
              <AvatarImage
                src={user.avatar || getDefaultAvatarForUsername(user.username)}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-blood-600 to-crimson-700 text-white font-bold">
                {user.username?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Status indicator */}
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-void-800",
              statusColors[user.status] || 'bg-gray-500'
            )}>
              {user.status === 'In Game' && (
                <Gamepad2 className="w-2 h-2 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              )}
            </div>
          </div>
          
          {/* User info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white group-hover/profile:text-blood-400 transition-colors truncate">
                {user.username}
              </span>
              <ExternalLink className="w-3 h-3 text-gray-500 opacity-0 group-hover/profile:opacity-100 transition-opacity" />
            </div>
            
            {showStats ? (
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                {/* Always show status */}
                <span className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded",
                  user.status === 'Online' && "text-emerald-400 bg-emerald-500/10",
                  user.status === 'In Game' && "text-violet-400 bg-violet-500/10",
                  user.status === 'Offline' && "text-gray-400 bg-gray-500/10"
                )}>
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    user.status === 'Online' && "bg-emerald-400",
                    user.status === 'In Game' && "bg-violet-400",
                    user.status === 'Offline' && "bg-gray-400"
                  )} />
                  {user.status || 'Offline'}
                </span>
                {/* Show hours played (even if 0) */}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {(user.hoursPlayed ?? 0).toLocaleString()}h
                </span>
                {/* Show friends count (even if 0) */}
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {user.friendsCount ?? 0}
                </span>
              </div>
            ) : (
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {user.bio || user.status || 'No bio'}
              </p>
            )}
          </div>
        </button>
        
        {/* Add button */}
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            if (!hasPendingRequest) {
              onAddFriend(user.username);
            }
          }}
          disabled={isPending || hasPendingRequest}
          className={cn(
            "relative overflow-hidden border-0 shadow-lg transition-all duration-300",
            hasPendingRequest 
              ? "bg-gradient-to-r from-amber-600/80 to-yellow-600/80 shadow-amber-500/20 cursor-not-allowed" 
              : "bg-gradient-to-r from-blood-600 to-crimson-600 hover:from-blood-500 hover:to-crimson-500 shadow-blood-500/20 hover:shadow-blood-500/40"
          )}
        >
          {hasPendingRequest ? (
            <>
              <Clock className="h-4 w-4 mr-1.5 animate-pulse" />
              <span>Pending</span>
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-1.5" />
              <span>Add</span>
            </>
          )}
          {/* Shine effect */}
          {!hasPendingRequest && (
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          )}
        </Button>
      </div>
    </div>
  );
}
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
    refetchInterval: 3000, // Real-time updates every 3 seconds
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
      // Force immediate refetch for real-time update
      queryClient.refetchQueries({ queryKey: ['friends'] });
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
  const [recommendSort, setRecommendSort] = useState<'hours' | 'friends' | 'random'>('hours');
  const queryClient = useQueryClient();
  
  const currentUserId = getCurrentUserId();
  const hasToken = !!getAuthToken();

  const { data: friendsResponse, isLoading, isError, error } = useQuery({
    queryKey: ['friends', currentUserId],
    queryFn: async () => {
      if (!currentUserId || !hasToken) return { items: [] };
      try {
        return await friendsApi.listFriends(currentUserId);
      } catch (err: any) {
        // If the user is not authenticated (missing / expired token), treat as "no friends"
        const message = String(err?.message || err?.detail || '');
        const status = err?.status || err?.statusCode || 0;
        if (
          status === 401 ||
          status === 403 ||
          message.includes('401') ||
          message.includes('403') ||
          message.toLowerCase().includes('unauthorized') ||
          message.toLowerCase().includes('missing bearer token') ||
          message.toLowerCase().includes('invalid token') ||
          message.toLowerCase().includes('token expired')
        ) {
          // User not authenticated - return empty list instead of error
          return { items: [] };
        }
        // For other errors, still return empty list to prevent UI crash
        console.error('Failed to load friends:', err);
        return { items: [] };
      }
    },
    enabled: !!currentUserId && hasToken,
    refetchInterval: false, // disable polling to avoid repeated 401s
    retry: false, // Don't retry on auth errors
  });

  const { data: gamesResponse } = useQuery({
    queryKey: ['games-for-friends'],
    enabled: hasToken && !!currentUserId,
    retry: false,
    queryFn: () => gamesApi.search({}, 1, 100),
  });
  
  const [discoverTab, setDiscoverTab] = useState<'recommended' | 'all'>('recommended');

  const { data: recommendedResponse, isLoading: isLoadingRecommended } = useQuery({
    queryKey: ['users-recommended'],
    queryFn: async () => {
      try {
        const data = await api<any[]>('/api/v1/users/recommended?limit=50');
        return Array.isArray(data) ? data : [];
      } catch (err: any) {
        // If endpoint doesn't exist or auth fails, return empty array gracefully
        const errorMsg = String(err?.message || err || '');
        if (
          !errorMsg.includes('401') &&
          !errorMsg.includes('403') &&
          !errorMsg.toLowerCase().includes('unauthorized')
        ) {
          console.warn('Failed to fetch recommended users:', err);
        }
        return [];
      }
    },
    enabled: addFriendOpen && discoverTab === 'recommended' && !!currentUserId && hasToken,
    retry: false,
  });
  
  const { data: allUsersResponse, isLoading: isLoadingAllUsers } = useQuery({
    queryKey: ['users-all'],
    queryFn: async () => {
      try {
        // user-service lists users at /api/v1/users/users
        const data = await api<any[]>('/api/v1/users/users?limit=200&skip=0');
        return Array.isArray(data) ? data : [];
      } catch (err: any) {
        console.warn('Failed to fetch all users:', err);
        return [];
      }
    },
    enabled: addFriendOpen && !!currentUserId && hasToken,
    retry: false,
  });
  
  const addFriendMutation = useMutation({
    mutationFn: async (username: string) => {
      if (!hasToken) {
        throw new Error('Please sign in to send requests.');
      }
      return api('/api/v1/friends/friends/requests', {
        method: 'POST',
        body: JSON.stringify({ target_user_id: username }),
      });
    },
    onSuccess: () => {
      toast.success('Friend request sent!');
      setAddFriendOpen(false);
      setSearchQuery('');
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.refetchQueries({ queryKey: ['friend-requests'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to send friend request: ${error.message}`);
    },
  });
  
  const friends = friendsResponse?.items ?? [];
  const gamesBySlug = new Map(
    (gamesResponse?.games ?? []).map((g) => [g.slug, g])
  );
  // API returns array directly, not wrapped in { items: [...] }
  const recommendedItems = recommendedResponse ?? [];
  const allUsersItems = allUsersResponse ?? [];
  
  const displayItems = discoverTab === 'all' ? allUsersItems : recommendedItems;
  const isLoadingItems = discoverTab === 'all' ? isLoadingAllUsers : isLoadingRecommended;
  const searchResults = searchQuery.length >= 2
    ? allUsersItems.filter(u =>
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];
  const isSearching = searchQuery.length >= 2 && isLoadingAllUsers;
  
  const sortedRecommendedItems = useMemo(() => {
    if (!displayItems.length) return [];
    const items = [...displayItems];
    if (recommendSort === 'hours') {
      items.sort((a, b) => (b.hoursPlayed ?? 0) - (a.hoursPlayed ?? 0));
    } else if (recommendSort === 'friends') {
      items.sort((a, b) => (b.friendsCount ?? 0) - (a.friendsCount ?? 0));
    } else {
      items.sort(() => Math.random() - 0.5);
    }
    return items;
  }, [displayItems, recommendSort]);
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
      // Only show error if it's not an auth error (auth errors are handled in queryFn)
      const errorMessage = String(error || '');
      if (
        !errorMessage.toLowerCase().includes('unauthorized') &&
        !errorMessage.toLowerCase().includes('missing bearer token') &&
        !errorMessage.toLowerCase().includes('invalid token')
      ) {
        return (
          <p className="text-center text-red-500">
            Failed to load friends list.
          </p>
        );
      }
      // Auth errors are treated as "no friends" - show empty state
      return (
        <p className="text-center text-gray-400 py-10">
          No friends yet. Add friends to get started!
        </p>
      );
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  className="bg-blood-500 hover:bg-blood-600"
                  onClick={() => {
                      if (!currentUserId || !hasToken) {
                        toast.error('Please sign in to manage friends.');
                        return;
                      }
                      setAddFriendOpen(true);
                    }}
                    disabled={!currentUserId || !hasToken}
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  Add Friend
                </Button>
              </TooltipTrigger>
                {!currentUserId || !hasToken ? (
                <TooltipContent>
                  <p>Sign in to add friends</p>
                </TooltipContent>
                ) : null}
            </Tooltip>
          </TooltipProvider>
          
          <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
            <DialogContent className="bg-gradient-to-b from-void-800 to-void-900 border border-void-600/50 text-white max-w-xl backdrop-blur-xl shadow-2xl shadow-black/50">
              {/* Background decoration */}
              <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blood-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-crimson-500/10 rounded-full blur-3xl" />
              </div>
              
              <div className="relative space-y-5">
                {/* Header */}
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-3xl font-orbitron bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blood-500 to-crimson-600 rounded-xl shadow-lg shadow-blood-500/30">
                      <UserPlus className="w-6 h-6 text-white" />
                    </div>
                    Add Friend
                  </DialogTitle>
                  <DialogDescription className="text-gray-400 text-base">
                    Search for players or discover new gaming buddies
                  </DialogDescription>
                </DialogHeader>

                {/* Search Input */}
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blood-500/50 to-crimson-500/50 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <Input
                      placeholder="Search by username..."
                      className="pl-12 pr-4 py-6 bg-void-800/80 border-void-600/50 text-white text-lg rounded-xl focus:border-blood-500/50 transition-all placeholder:text-gray-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-void-700 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Search Results */}
                {isSearching && (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-void-800/50 rounded-xl animate-pulse">
                        <div className="w-12 h-12 rounded-full bg-void-700" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-24 bg-void-700 rounded" />
                          <div className="h-3 w-32 bg-void-700/50 rounded" />
                        </div>
                        <div className="h-9 w-20 bg-void-700 rounded-lg" />
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 && !isSearching && (
                  <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-void-600 scrollbar-track-transparent pr-2">
                    {searchResults.length > 0 ? (
                      <>
                        <p className="text-xs text-gray-500 uppercase tracking-wider px-1">
                          {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                        </p>
                        {searchResults.map((user: any) => (
                          <UserCard
                            key={user.id}
                            user={user}
                            onAddFriend={(username) => addFriendMutation.mutate(username)}
                            isPending={addFriendMutation.isPending}
                            showStats={false}
                            hasPendingRequest={user.hasPendingRequest}
                          />
                        ))}
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-void-700/50 flex items-center justify-center">
                          <Search className="w-8 h-8 text-gray-500" />
                        </div>
                        <p className="text-gray-400">No players found for "{searchQuery}"</p>
                        <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Discovery Tabs */}
                {searchQuery.length < 2 && (
                  <div className="space-y-4">
                    {/* Tab buttons */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setDiscoverTab('recommended')}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300",
                          discoverTab === 'recommended'
                            ? "bg-gradient-to-r from-blood-600 to-crimson-600 text-white shadow-lg shadow-blood-500/30"
                            : "bg-void-700/50 text-gray-400 hover:text-white hover:bg-void-700"
                        )}
                      >
                        <Sparkles className="w-4 h-4" />
                        Recommended
                      </button>
                      <button
                        onClick={() => setDiscoverTab('all')}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300",
                          discoverTab === 'all'
                            ? "bg-gradient-to-r from-blood-600 to-crimson-600 text-white shadow-lg shadow-blood-500/30"
                            : "bg-void-700/50 text-gray-400 hover:text-white hover:bg-void-700"
                        )}
                      >
                        <Users className="w-4 h-4" />
                        All Players
                      </button>
                    </div>

                    {/* Sort options */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Sort by:</span>
                      <div className="flex gap-1.5">
                        {[
                          { key: 'hours' as const, label: 'Top Players', icon: Clock },
                          { key: 'friends' as const, label: 'Popular', icon: Users },
                          { key: 'random' as const, label: 'Shuffle', icon: Shuffle },
                        ].map(({ key, label, icon: Icon }) => (
                          <button
                            key={key}
                            onClick={() => setRecommendSort(key)}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                              recommendSort === key
                                ? "bg-blood-500/20 text-blood-400 border border-blood-500/30"
                                : "bg-void-700/30 text-gray-400 hover:text-white hover:bg-void-700/50 border border-transparent"
                            )}
                          >
                            <Icon className="w-3 h-3" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* User list */}
                    {isLoadingItems ? (
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-4 p-4 bg-void-800/50 rounded-xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                            <div className="w-12 h-12 rounded-full bg-void-700" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 w-24 bg-void-700 rounded" />
                              <div className="h-3 w-32 bg-void-700/50 rounded" />
                            </div>
                            <div className="h-9 w-20 bg-void-700 rounded-lg" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-void-600 scrollbar-track-transparent pr-2">
                        {sortedRecommendedItems.length > 0 ? (
                          sortedRecommendedItems.map((user: any, index: number) => (
                            <div 
                              key={user.id} 
                              className="animate-fade-in"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <UserCard
                                user={{
                                  ...user,
                                  hoursPlayed: user.hours_played ?? 0,
                                  friendsCount: user.friends_count ?? 0,
                                  status: user.status === 'active' ? 'Online' : 'Offline',
                                  avatar: user.avatar_url,
                                }}
                                onAddFriend={(username) => addFriendMutation.mutate(username)}
                                isPending={addFriendMutation.isPending}
                                showStats={true}
                                hasPendingRequest={user.hasPendingRequest}
                              />
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-void-700/50 flex items-center justify-center">
                              <Users className="w-8 h-8 text-gray-500" />
                            </div>
                            <p className="text-gray-400">No players to show</p>
                            <p className="text-sm text-gray-500 mt-1">Check back later for recommendations</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer */}
                <DialogFooter className="border-t border-void-700/50 pt-4 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAddFriendOpen(false);
                      setSearchQuery('');
                    }}
                    className="bg-void-700/50 border-void-600/50 hover:bg-void-700 hover:border-void-500 transition-all"
                  >
                    Close
                  </Button>
                </DialogFooter>
              </div>
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