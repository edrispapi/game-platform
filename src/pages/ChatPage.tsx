'use client';
import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, MoreVertical, Phone, Video, Info } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Friend, ChatMessage } from "@shared/types";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [messageText, setMessageText] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: friendsResponse } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api<{ items: Friend[] }>('/api/friends'),
  });

  const friend = friendsResponse?.items.find(f => f.id === id);

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['chat-messages', id],
    queryFn: () => api<ChatMessage[]>(`/api/chats/${id}/messages`),
    enabled: !!id,
    refetchInterval: 1000, // Poll for new messages every 1 second for real-time feel
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      return api<ChatMessage>(`/api/chats/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ userId: 'user-1', text }),
      });
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['chat-messages', id] });
    },
    onError: (error) => {
      toast.error(`Failed to send message: ${error.message}`);
    },
  });

  const handleSend = () => {
    if (!messageText.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(messageText.trim());
  };

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

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

  const currentUserId = 'user-1';

  return (
    <div className="flex flex-col h-[calc(100vh-104px)] bg-void-900 rounded-lg border border-void-700 animate-fade-in overflow-hidden">
      {/* Enhanced Header */}
      <header className="flex items-center justify-between p-4 border-b border-void-700 bg-void-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="shrink-0"
          >
            <Link to="/friends">
              <ArrowLeft className="h-5 w-5" />
            </Link>
        </Button>
          <Avatar className="h-10 w-10 shrink-0 border-2 border-blood-500/50">
            <AvatarImage src={friend.avatar} alt={friend.username} />
            <AvatarFallback className="bg-blood-500/20 text-blood-400">
              {friend.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
        </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg truncate">{friend.username}</h2>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${
                friend.status === 'Online' ? 'bg-green-400 animate-pulse' :
                friend.status === 'In Game' ? 'bg-blue-400' : 'bg-gray-500'
              }`} />
              <p className={`text-sm truncate ${
                friend.status === 'Online' ? 'text-green-400' :
                friend.status === 'In Game' ? 'text-blue-400' : 'text-gray-400'
              }`}>
                {friend.status}
                {friend.game && ` - Playing ${friend.game}`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="hover:bg-void-700">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:bg-void-700">
            <Video className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-void-700">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-void-800 border-void-700">
              <DropdownMenuItem className="hover:bg-void-700">
                <Info className="mr-2 h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-void-700 text-red-400">
                Block User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
        {isLoadingMessages ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-end gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-20 w-64 rounded-lg" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <div className="mb-4 p-4 rounded-full bg-void-800">
              <Send className="h-8 w-8 text-blood-500/50" />
            </div>
            <p className="text-lg font-semibold mb-2">No messages yet</p>
            <p className="text-sm">Start the conversation with {friend.username}!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isFromMe = msg.userId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-3 ${isFromMe ? "justify-end" : "justify-start"}`}
                >
                  {!isFromMe && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={friend.avatar} />
                      <AvatarFallback>{friend.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-xs lg:max-w-md ${
                    isFromMe ? "order-2" : "order-1"
                  }`}>
                    <div className={`p-3 rounded-lg ${
                      isFromMe
                        ? "bg-blood-600 text-white rounded-br-none"
                        : "bg-void-700 text-gray-100 rounded-bl-none"
                    }`}>
                      <p className="break-words">{msg.text}</p>
                    </div>
                    <p className={`text-xs mt-1 px-1 ${
                      isFromMe ? 'text-right text-gray-400' : 'text-left text-gray-500'
                    }`}>
                      {formatDistanceToNow(new Date(msg.ts), { addSuffix: true })}
                    </p>
                  </div>
                  {isFromMe && (
                    <Avatar className="h-8 w-8 shrink-0 order-3">
                      <AvatarImage src="https://github.com/shadcn.png" />
                      <AvatarFallback>ME</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}
        </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <footer className="p-4 border-t border-void-700 bg-void-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Input
            placeholder={`Message ${friend.username}...`}
            className="bg-void-700 border-void-600 focus:ring-blood-500 text-white placeholder:text-gray-500"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={sendMessageMutation.isPending}
          />
          <Button
            className="bg-blood-500 hover:bg-blood-600 shrink-0"
            onClick={handleSend}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
