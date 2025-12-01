'use client';
import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, TrendingUp, Clock, User, ArrowLeft, Plus, ThumbsUp, MessageCircle, Search, Filter, Eye, Sparkles } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Game, ForumPost, ForumReply } from "@shared/types";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { UserLink } from "@/components/UserLink";
import { CommentReactions } from "@/components/CommentReactions";


export function GameForumPage() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newReplyContent, setNewReplyContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'replies' | 'likes'>('newest');
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

  // Extract all unique tags from posts
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach(post => post.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [posts]);

  // Filter and sort posts
  const filteredAndSortedPosts = useMemo(() => {
    let filtered = posts.filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = selectedTag === 'all' || post.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });

    // Sort posts
    filtered.sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt - a.createdAt;
      if (sortBy === 'popular') return b.views - a.views;
      if (sortBy === 'replies') return b.replies - a.replies;
      if (sortBy === 'likes') return b.likes - a.likes;
      return 0;
    });

    // Put pinned posts first
    return filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }, [posts, searchQuery, selectedTag, sortBy]);

  // Trending posts (most liked in last 7 days)
  const trendingPosts = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return posts
      .filter(post => post.createdAt >= sevenDaysAgo)
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 10);
  }, [posts]);

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
        <Button 
          variant="ghost" 
          className="mb-4 hover:bg-void-700"
          onClick={() => setSelectedPost(null)}
        >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Forum
        </Button>

        {/* Post Detail Card */}
        <Card className="bg-void-800 border-void-700 shadow-lg">
          <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
                  {selectedPost.pinned && (
                    <Badge className="bg-yellow-600 text-white font-semibold text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Pinned
                    </Badge>
                  )}
                  {selectedPost.tags.map(tag => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="text-xs cursor-pointer hover:bg-blood-500/20 hover:border-blood-500 transition-colors"
                      onClick={() => {
                        setSelectedPost(null);
                        setSelectedTag(tag);
                      }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-white break-words">{selectedPost.title}</CardTitle>
                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400 flex-wrap">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border-2 border-void-600 shrink-0">
                      <AvatarImage src={selectedPost.authorAvatar} />
                      <AvatarFallback className="bg-void-700 text-white text-xs">
                        {selectedPost.author.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <UserLink username={selectedPost.author} className="font-semibold hover:text-blood-400 transition-colors truncate">
                      {selectedPost.author}
                    </UserLink>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                    <span className="whitespace-nowrap">{formatDistanceToNow(new Date(selectedPost.createdAt), { addSuffix: true, includeSeconds: true })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                  <span>{selectedPost.views} views</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-6 whitespace-pre-wrap leading-relaxed text-base">
                {selectedPost.content}
              </p>
            </div>
            <div className="flex items-center gap-4 pt-6 border-t border-void-700">
              <Button 
                variant="outline" 
                size="sm" 
                className={`gap-2 hover:bg-void-700 hover:border-blood-500/50 ${selectedPost.isLiked ? 'bg-blood-500/20 border-blood-500' : ''}`}
                onClick={() => {
                  const wasLiked = selectedPost.isLiked;
                  const newLikes = wasLiked ? selectedPost.likes - 1 : selectedPost.likes + 1;
                  
                  // Optimistic update for list
                  queryClient.setQueryData(['forum-posts', slug], (old: any) => {
                    if (!old) return old;
                    return {
                      ...old,
                      items: old.items.map((p: ForumPost) => 
                        p.id === selectedPost.id 
                          ? { ...p, isLiked: !wasLiked, likes: newLikes }
                          : p
                      ),
                    };
                  });

                  // Optimistic update for selected post detail
                  setSelectedPost(prev =>
                    prev && prev.id === selectedPost.id
                      ? { ...prev, isLiked: !wasLiked, likes: newLikes }
                      : prev
                  );
                  
                  api(`/api/forum/posts/${selectedPost.id}/like`, { method: 'POST' })
                    .then(() => {
                      queryClient.invalidateQueries({ queryKey: ['forum-posts', slug] });
                      queryClient.invalidateQueries({ queryKey: ['forum-posts', slug, selectedPost.id] });
                    })
                    .catch(() => {
                      // Revert on error
                      queryClient.setQueryData(['forum-posts', slug], (old: any) => {
                        if (!old) return old;
                        return {
                          ...old,
                          items: old.items.map((p: ForumPost) => 
                            p.id === selectedPost.id 
                              ? { ...p, isLiked: wasLiked, likes: selectedPost.likes }
                              : p
                          ),
                        };
                      });
                      setSelectedPost(prev =>
                        prev && prev.id === selectedPost.id
                          ? { ...prev, isLiked: wasLiked, likes: selectedPost.likes }
                          : prev
                      );
                      toast.error('Failed to like post');
                    });
                }}
              >
                <ThumbsUp className={`h-4 w-4 ${selectedPost.isLiked ? 'fill-current' : ''}`} /> 
                {selectedPost.likes}
              </Button>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MessageCircle className="h-4 w-4" />
                <span className="font-medium">{totalRepliesForSelectedPost} {totalRepliesForSelectedPost === 1 ? 'reply' : 'replies'}</span>
              </div>
            </div>
            <CommentReactions compact className="mt-2" />
          </CardContent>
        </Card>

        {/* Replies Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-blood-500" />
              Replies ({replies.length})
            </h3>
          </div>
          {isLoadingReplies ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : replies.length > 0 ? (
            replies.map(reply => (
              <Card key={reply.id} className="bg-void-800 border-void-700 hover:border-void-600 transition-colors">
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-start gap-2 sm:gap-4">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-void-600 flex-shrink-0">
                    <AvatarImage src={reply.authorAvatar} />
                      <AvatarFallback className="bg-void-700 text-white text-xs">
                        {reply.author.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                  </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 flex-wrap">
                        <UserLink username={reply.author} className="font-bold text-white hover:text-blood-400 transition-colors text-sm sm:text-base">
                        {reply.author}
                      </UserLink>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, includeSeconds: true })}
                      </span>
                    </div>
                      <p className="text-gray-300 mb-2 sm:mb-3 leading-relaxed text-sm sm:text-base break-words">{reply.content}</p>
                    <CommentReactions compact />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
          ) : (
            <Card className="bg-void-800 border-void-700 border-dashed">
              <CardContent className="p-12 text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-lg mb-2">No replies yet</p>
                <p className="text-gray-500 text-sm">Be the first to share your thoughts!</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Reply Form */}
        <Card className="bg-void-800 border-void-700 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blood-500" />
              Post a Reply
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Share your thoughts..."
              className="bg-void-700 border-void-600 min-h-[120px] text-white placeholder:text-gray-500 focus:border-blood-500 focus:ring-blood-500"
              value={newReplyContent}
              onChange={(e) => setNewReplyContent(e.target.value)}
            />
            <div className="flex justify-end">
            <Button
              onClick={() => createReplyMutation.mutate()}
              disabled={!newReplyContent.trim() || createReplyMutation.isPending}
                className="bg-blood-500 hover:bg-blood-600 min-w-[120px]"
            >
                {createReplyMutation.isPending ? (
                  <>Posting...</>
                ) : (
                  <>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Post Reply
                  </>
                )}
            </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-orbitron text-4xl font-black text-blood-500 mb-2">
            {game?.title} Forum
          </h1>
          <p className="text-gray-400">Join the community discussion</p>
        </div>
        <Button asChild variant="outline" className="border-void-700 hover:bg-void-800">
          <Link to={`/game/${slug}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Game
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="bg-void-800 border-void-700 grid w-full grid-cols-3">
          <TabsTrigger value="posts" className="data-[state=active]:bg-blood-500 data-[state=active]:text-white">
            All Posts
          </TabsTrigger>
          <TabsTrigger value="create" className="data-[state=active]:bg-blood-500 data-[state=active]:text-white">
            Create Post
          </TabsTrigger>
          <TabsTrigger value="trending" className="data-[state=active]:bg-blood-500 data-[state=active]:text-white">
            <TrendingUp className="mr-2 h-4 w-4" />
            Trending
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-6 mt-6">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search posts, authors..."
                className="pl-10 bg-void-800 border-void-700 focus:ring-blood-500 focus:border-blood-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="px-4 py-2 bg-void-800 border border-void-700 rounded-md text-white text-sm focus:ring-blood-500 focus:border-blood-500"
              >
                <option value="all">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-4 py-2 bg-void-800 border border-void-700 rounded-md text-white text-sm focus:ring-blood-500 focus:border-blood-500"
              >
                <option value="newest">Newest</option>
                <option value="popular">Most Popular</option>
                <option value="replies">Most Replies</option>
                <option value="likes">Most Liked</option>
              </select>
            </div>
          </div>

          {/* Posts List */}
          {isLoadingPosts ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredAndSortedPosts.length > 0 ? (
            <div className="space-y-4">
              {filteredAndSortedPosts.map(post => (
            <Card
              key={post.id}
                  className="bg-void-800 border-void-700 hover:border-blood-500/50 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-lg"
              onClick={() => setSelectedPost(post)}
            >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
                          {post.pinned && (
                            <Badge className="bg-yellow-600 text-white font-semibold text-xs">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Pinned
                            </Badge>
                          )}
                      {post.tags.map(tag => (
                            <Badge 
                              key={tag} 
                              variant="secondary" 
                              className="text-xs cursor-pointer hover:bg-blood-500/20 hover:border-blood-500 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTag(tag);
                              }}
                            >
                              {tag}
                            </Badge>
                      ))}
                    </div>
                        <h3 className="text-lg sm:text-xl font-bold mb-2 group-hover:text-blood-400 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                        <p className="text-gray-400 mb-3 sm:mb-4 line-clamp-2 leading-relaxed text-sm sm:text-base">{post.content}</p>
                        <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-500 flex-wrap">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Avatar className="h-5 w-5 sm:h-6 sm:w-6 border border-void-600 shrink-0">
                              <AvatarImage src={post.authorAvatar} />
                              <AvatarFallback className="bg-void-700 text-xs">
                                {post.author.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <UserLink username={post.author} className="hover:text-blood-400 transition-colors truncate">
                          {post.author}
                        </UserLink>
                      </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                            <span className="whitespace-nowrap">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, includeSeconds: true })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                            <span className="font-medium">{post.replies}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                            <span className="font-medium">{post.likes}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                            <span>{post.views}</span>
                      </div>
                      </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
                  </div>
          ) : (
            <Card className="bg-void-800 border-void-700 border-dashed">
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-lg mb-2">No posts found</p>
                <p className="text-gray-500 text-sm">
                  {searchQuery || selectedTag !== 'all' 
                    ? 'Try adjusting your search or filters' 
                    : 'Be the first to create a post!'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4 mt-6">
          <Card className="bg-void-800 border-void-700 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Plus className="h-6 w-6 text-blood-500" />
                Create New Post
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Post Title</label>
              <Input
                  placeholder="Give your post a clear, descriptive title..."
                  className="bg-void-700 border-void-600 text-white placeholder:text-gray-500 focus:border-blood-500 focus:ring-blood-500"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
              />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Content</label>
              <Textarea
                  placeholder="Share your thoughts, questions, or ideas with the community..."
                  className="bg-void-700 border-void-600 min-h-[250px] text-white placeholder:text-gray-500 focus:border-blood-500 focus:ring-blood-500"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
              />
              </div>
              <div className="flex justify-end pt-4 border-t border-void-700">
              <Button
                onClick={() => createPostMutation.mutate()}
                disabled={!newPostTitle.trim() || !newPostContent.trim() || createPostMutation.isPending}
                  className="bg-blood-500 hover:bg-blood-600 min-w-[140px]"
              >
                  {createPostMutation.isPending ? (
                    <>Creating...</>
                  ) : (
                    <>
                <Plus className="mr-2 h-4 w-4" />
                      Create Post
                    </>
                  )}
      </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trending" className="space-y-4 mt-6">
          {trendingPosts.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-6 w-6 text-blood-500" />
                <h2 className="text-2xl font-bold text-white">Trending This Week</h2>
              </div>
              {trendingPosts.map((post, index) => (
                <Card
                  key={post.id}
                  className="bg-void-800 border-void-700 hover:border-blood-500/50 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-lg"
                  onClick={() => setSelectedPost(post)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blood-500/20 flex items-center justify-center text-blood-500 font-bold text-lg">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {post.pinned && (
                            <Badge className="bg-yellow-600 text-white">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Pinned
                            </Badge>
                          )}
                          {post.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                        <h3 className="text-xl font-bold mb-2 group-hover:text-blood-400 transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-gray-400 mb-4 line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={post.authorAvatar} />
                              <AvatarFallback className="bg-void-700 text-xs">
                                {post.author.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <UserLink username={post.author} className="hover:text-blood-400">
                              {post.author}
                            </UserLink>
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-4 w-4 text-blood-500" />
                            <span className="font-bold text-blood-400">{post.likes} likes</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4" />
                            <span>{post.replies} replies</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
          ) : (
            <Card className="bg-void-800 border-void-700 border-dashed">
              <CardContent className="p-12 text-center">
                <TrendingUp className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-lg mb-2">No trending posts yet</p>
                <p className="text-gray-500 text-sm">Posts with the most likes this week will appear here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
