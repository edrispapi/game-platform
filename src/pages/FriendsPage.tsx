import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
export function FriendsPage() {
  // Placeholder data
  const friends = [
    { id: 1, name: 'CyberNinja', status: 'Online', game: 'Cyberpunk 2077', avatar: '/avatars/01.png' },
    { id: 2, name: 'WitcherFan', status: 'Offline', game: '', avatar: '/avatars/02.png' },
    { id: 3, name: 'HadesPlayer', status: 'In Game', game: 'Hades', avatar: '/avatars/03.png' },
  ];
  const requests = [
    { id: 4, name: 'StardewFarmer', avatar: '/avatars/04.png' },
  ];
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
            {friends.map(friend => (
              <div key={friend.id} className="flex items-center justify-between p-4 bg-void-800 rounded-lg border border-void-700">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={friend.avatar} />
                    <AvatarFallback>{friend.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-lg">{friend.name}</p>
                    <p className={`text-sm ${friend.status === 'Online' ? 'text-green-400' : 'text-gray-400'}`}>
                      {friend.status} {friend.game && `- Playing ${friend.game}`}
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="border-void-600 hover:bg-void-700">Message</Button>
              </div>
            ))}
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