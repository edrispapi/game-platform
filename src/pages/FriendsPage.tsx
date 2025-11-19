import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Friend, Game } from "@shared/types";
import { Skeleton } from "@/components/ui/skeleton";
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
  // Placeholder data for requests
  const requests = [
    { id: 4, name: 'StardewFarmer', avatar: 'https://i.pravatar.cc/150?u=request1' },
  ];
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
          <Button variant="outline" className="border-void-600 hover:bg-void-700">Message</Button>
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
          <TabsTrigger value="requests">Friend Requests ({requests.length})</TabsTrigger>
          <TabsTrigger value="blocked">Blocked</TabsTrigger>
        </TabsList>
        <TabsContent value="friends" className="py-6">
          <div className="space-y-4">
            {renderFriendList()}
          </div>
        </TabsContent>
        <TabsContent value="requests" className="py-6">
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req.id} className="flex items-center justify-between p-4 bg-void-800 rounded-lg border border-void-700">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={req.avatar} />
                    <AvatarFallback>{req.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <p className="font-bold text-lg">{req.name}</p>
                </div>
                <div className="flex gap-2">
                  <Button className="bg-green-600 hover:bg-green-700">Accept</Button>
                  <Button variant="destructive">Decline</Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="blocked" className="py-6">
          <p className="text-center text-gray-400">You haven't blocked any players.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}