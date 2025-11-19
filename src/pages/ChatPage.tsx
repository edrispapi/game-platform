import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send } from "lucide-react";
import { MOCK_FRIENDS } from "@shared/mock-data";
const mockMessages = [
  { fromMe: false, text: "Hey, up for a game of Cyberpunk later?", time: "10:30 AM" },
  { fromMe: true, text: "Yeah, definitely! I'll be on around 8 PM.", time: "10:31 AM" },
  { fromMe: false, text: "Sounds good. See you then!", time: "10:31 AM" },
  { fromMe: true, text: "👍", time: "10:32 AM" },
];
export function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const friend = MOCK_FRIENDS.find(f => f.id === id);
  if (!friend) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-2">Friend not found</h2>
        <Button asChild variant="link">
          <Link to="/friends">Go back to friends list</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-[calc(100vh-104px)] bg-void-900 rounded-lg border border-void-700 animate-fade-in">
      <header className="flex items-center gap-4 p-4 border-b border-void-700">
        <Button asChild variant="ghost" size="icon" className="md:hidden">
          <Link to="/friends"><ArrowLeft /></Link>
        </Button>
        <Avatar>
          <AvatarImage src={friend.avatar} />
          <AvatarFallback>{friend.username.substring(0, 2)}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-bold text-lg">{friend.username}</h2>
          <p className={`text-sm ${friend.status === 'Online' ? 'text-green-400' : 'text-gray-400'}`}>{friend.status}</p>
        </div>
      </header>
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          {mockMessages.map((msg, idx) => (
            <div key={idx} className={`flex items-end gap-3 ${msg.fromMe ? "justify-end" : "justify-start"}`}>
              {!msg.fromMe && <Avatar className="h-8 w-8"><AvatarImage src={friend.avatar} /></Avatar>}
              <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${msg.fromMe ? "bg-blood-600 text-white rounded-br-none" : "bg-void-700 rounded-bl-none"}`}>
                <p>{msg.text}</p>
                <p className={`text-xs mt-1 ${msg.fromMe ? 'text-gray-300' : 'text-gray-500'}`}>{msg.time}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <footer className="p-4 border-t border-void-700">
        <div className="flex items-center gap-2">
          <Input placeholder="Type a message..." className="bg-void-800 border-void-600 focus:ring-blood-500" />
          <Button className="bg-blood-500 hover:bg-blood-600">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </footer>
    </div>
  );
}