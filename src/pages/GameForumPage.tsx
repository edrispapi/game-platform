'use client';
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { Link, useParams } from "react-router-dom";
export function GameForumPage() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 animate-fade-in">
      <MessageSquare className="h-24 w-24 text-blood-500/50 mb-6" />
      <h1 className="font-orbitron text-4xl font-black text-blood-500 mb-4">Game Forum</h1>
      <p className="text-gray-400 mb-8 max-w-md">
        The community forum for this game is under construction. Check back soon for discussions, guides, and more!
      </p>
      <Button asChild className="bg-blood-500 hover:bg-blood-600">
        <Link to={`/game/${slug}`}>Back to Game Page</Link>
      </Button>
    </div>
  );
}