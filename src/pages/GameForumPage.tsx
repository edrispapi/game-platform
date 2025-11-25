'use client';
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, TrendingUp, Clock, User, ArrowLeft, Plus, ThumbsUp, MessageCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Game, ForumPost, ForumReply } from "@shared/types";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { UserLink } from "@/components/UserLink";


export function GameForumPage() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newReplyContent, setNewReplyContent] = useState('');
  const [likedPost, setLikedPost] = useState(false);
  const [likedReplies, setLikedReplies] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();

  const { data: game, isLoading: isLoadingGame } = useQuery({
    queryKey: ['game', slug],
    queryFn: () => api<Game>(`/api/games/${slug}`),
    enabled: !!slug,
  });

  const { data: postsResponse, isLoading: isLoadingPosts } = useQuery({
    queryKey: ['forum-posts', slug],
    queryFn: () => api<{ items: ForumPost[] }>(`/api/games/${slug}/forum/posts`),
    enabled: !!slug,
  });

  const { data: repliesResponse, isLoading: isLoadingReplies } = useQuery({
    queryKey: ['forum-replies', selectedPost?.id],
    queryFn: () => api<{ items: ForumReply[] }>(`/api/forum/posts/${selectedPost?.id}/replies`),
    enabled: !!selectedPost?.id,
  });

  const posts = postsResponse?.items ?? [];
  const replies = repliesResponse?.items ?? [];

  const totalRepliesForSelectedPost = useMemo(
    () => (selectedPost ? replies.length : 0),
    [selectedPost, replies]
  );

  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!slug) throw new Error('Game slug is required');
      return api<ForumPost>(`/api/games/${slug}/forum/posts`, {
        method: 'POST',
        body: JSON.stringify({
          title: newPostTitle,
          content: newPostContent,
          tags: [],
        }),
      });
    },
    onSuccess: () => {
      toast.success('Post created successfully!');
      setNewPostTitle('');
      setNewPostContent('');
      queryClient.invalidateQueries({ queryKey: ['forum-posts', slug] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create post: ${error.message}`);
    },
  });

  const createReplyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPost) throw new Error('Post is required');
      return api<ForumReply>(`/api/forum/posts/${selectedPost.id}/replies`, {
        method: 'POST',
        body: JSON.stringify({
          content: newReplyContent,
        }),
      });
    },
    onSuccess: () => {
      toast.success('Reply posted!');
      setNewReplyContent('');
      queryClient.invalidateQueries({ queryKey: ['forum-replies', selectedPost?.id] });
      queryClient.invalidateQueries({ queryKey: ['forum-posts', slug] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to post reply: ${error.message}`);
    },
  });

  if (isLoadingGame) {
    return <div className="space-y-4"><Skeleton className="h-32 w-full" /></div>;
  }

  if (selectedPost) {
    return (
      <div className="animate-fade-in space-y-6">
        <Button asChild variant="ghost" className="mb-4">
          <Link to={`/game/${slug}/forum`} onClick={() => setSelectedPost(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Forum
          </Link>
        </Button>
        <Card className="bg-void-800 border-void-700">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {selectedPost.pinned && <Badge className="bg-yellow-600">Pinned</Badge>}
                  {selectedPost.tags.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
                <CardTitle className="text-2xl mb-2">{selectedPost.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={selectedPost.authorAvatar} />
                      <AvatarFallback>{selectedPost.author.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <UserLink username={selectedPost.author}>
                      {selectedPost.author}
                    </UserLink>
                  </div>
                  <span>{formatDistanceToNow(new Date(selectedPost.createdAt), { addSuffix: true })}</span>
                  <span>{selectedPost.views} views</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-6 whitespace-pre-wrap">{selectedPost.content}</p>
            <div className="flex items-center gap-4 pt-4 border-t border-void-700">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => {
                  if (likedPost) return;
                  setLikedPost(true);
                  api(`/api/forum/posts/${selectedPost.id}/like`, { method: 'POST' })
                    .then(() => {
                      queryClient.invalidateQueries({ queryKey: ['forum-posts', slug] });
                    })
                    .catch(() => {
                      setLikedPost(false);
                      toast.error('Failed to like post');
                    });
                }}
                disabled={likedPost}
              >
                <ThumbsUp className="h-4 w-4" /> {selectedPost.likes + (likedPost ? 1 : 0)}
              </Button>
              <span className="text-sm text-gray-400">
                {totalRepliesForSelectedPost} replies
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-xl font-bold">Replies ({replies.length})</h3>
          {isLoadingReplies ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))
          ) : replies.length > 0 ? (
            replies.map(reply => (
            <Card key={reply.id} className="bg-void-800 border-void-700">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarImage src={reply.authorAvatar} />
                    <AvatarFallback>{reply.author.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <UserLink username={reply.author} className="font-bold">
                        {reply.author}
                      </UserLink>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-gray-300">{reply.content}</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 gap-2"
                      onClick={() => {
                        if (likedReplies[reply.id]) return;
                        setLikedReplies((prev) => ({ ...prev, [reply.id]: true }));
                        api(`/api/forum/replies/${reply.id}/like`, { method: 'POST' })
                          .then(() => {
                            queryClient.invalidateQueries({ queryKey: ['forum-replies', selectedPost?.id] });
                          })
                          .catch(() => {
                            setLikedReplies((prev) => {
                              const next = { ...prev };
                              delete next[reply.id];
                              return next;
                            });
                            toast.error('Failed to like reply');
                          });
                      }}
                      disabled={likedReplies[reply.id]}
                    >
                      <ThumbsUp className="h-3 w-3" /> {reply.likes + (likedReplies[reply.id] ? 1 : 0)}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
          ) : (
            <p className="text-center text-gray-400 py-10">No replies yet. Be the first to reply!</p>
          )}
        </div>

        <Card className="bg-void-800 border-void-700">
          <CardHeader>
            <CardTitle>Post a Reply</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Write your reply..."
              className="mb-4 bg-void-700 border-void-600 min-h-[100px]"
              value={newReplyContent}
              onChange={(e) => setNewReplyContent(e.target.value)}
            />
            <Button
              onClick={() => createReplyMutation.mutate()}
              disabled={!newReplyContent.trim() || createReplyMutation.isPending}
              className="bg-blood-500 hover:bg-blood-600"
            >
              {createReplyMutation.isPending ? 'Posting...' : 'Post Reply'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-orbitron text-4xl font-black text-blood-500 mb-2">
            {game?.title} Forum
          </h1>
          <p className="text-gray-400">Join the community discussion</p>
        </div>
        <Button asChild variant="outline">
          <Link to={`/game/${slug}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Game
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="bg-void-800 border-void-700">
          <TabsTrigger value="posts">All Posts</TabsTrigger>
          <TabsTrigger value="create">Create Post</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {isLoadingPosts ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))
          ) : posts.length > 0 ? (
            posts.map(post => (
            <Card
              key={post.id}
              className="bg-void-800 border-void-700 hover:border-blood-500/50 transition-colors cursor-pointer"
              onClick={() => setSelectedPost(post)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {post.pinned && <Badge className="bg-yellow-600">Pinned</Badge>}
                      {post.tags.map(tag => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                    <h3 className="text-xl font-bold mb-2 hover:text-blood-400 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-gray-400 mb-4 line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <UserLink username={post.author}>
                          {post.author}
                        </UserLink>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        <span>{post.replies} replies</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ThumbsUp className="h-4 w-4" />
                        <span>{post.likes}</span>
                      </div>
                      <span>{post.views} views</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
          ) : (
            <p className="text-center text-gray-400 py-10">No posts yet. Be the first to create one!</p>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card className="bg-void-800 border-void-700">
            <CardHeader>
              <CardTitle>Create New Post</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Post title..."
                className="bg-void-700 border-void-600"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
              />
              <Textarea
                placeholder="Write your post content..."
                className="bg-void-700 border-void-600 min-h-[200px]"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
              />
              <Button
                onClick={() => createPostMutation.mutate()}
                disabled={!newPostTitle.trim() || !newPostContent.trim() || createPostMutation.isPending}
                className="bg-blood-500 hover:bg-blood-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                {createPostMutation.isPending ? 'Creating...' : 'Create Post'}
      </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          <div className="text-center py-10 text-gray-400">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-blood-500/50" />
            <p>Trending posts will appear here</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
