'use client';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Star, Calendar, User, ArrowLeft, Plus, Filter, Search, TrendingUp, Sparkles, Heart, Upload, File, Image as ImageIcon } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  gamesApi,
  workshopApi,
  getAuthToken,
  type GameResponse,
  type WorkshopItemResponse,
  type WorkshopItemCreate,
  type WorkshopComment,
  type WorkshopRatingSummary,
} from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserLink } from "@/components/UserLink";
import { WebGLImage } from "@/components/WebGLImage";
import { CommentReactions } from "@/components/CommentReactions";
const defaultWorkshopFallback = "/images/default-workshop.svg";
const isOrbUnsafe = (url: string | undefined) =>
  !!url && (url.includes("picsum.photos") || url.includes("800x450/?"));
const isUserUploadedImage = (url: string | undefined) => {
  if (!url) return false;
  if (url.startsWith("data:") || url.startsWith("file:")) return true;
  try {
    const resolved = new URL(url, window.location.origin);
    return resolved.origin === window.location.origin;
  } catch {
    return false;
  }
};

interface WorkshopItemView {
  id: number;
  title: string;
  description: string;
  downloads: number;
  rating: number;
  ratingCount?: number;
  createdAt: number;
  type: 'mod' | 'skin' | 'map' | 'tool';
  image?: string;
  fileUrl?: string;
  featured?: boolean;
  author: string;
  author_username?: string | null;
  author_avatar_url?: string | null;
  authorAvatar?: string;
  tags: string[];
  favoritesCount?: number;
  favorited?: boolean;
}

function mapWorkshopItem(api: WorkshopItemResponse): WorkshopItemView {
  // Prefer backend rating; fallback to votes ratio
  const totalVotes = api.votes_up + api.votes_down;
  const ratio = totalVotes > 0 ? api.votes_up / totalVotes : 0;
  const fallbackRating = Math.round(ratio * 5 * 10) / 10;
  const rating = typeof api.rating_avg === 'number' ? api.rating_avg : fallbackRating;

  // Derive type from tags if possible, otherwise default to 'mod'
  const lowerTags = (api.tags || []).map(t => t.toLowerCase());
  let type: 'mod' | 'skin' | 'map' | 'tool' = 'mod';
  if (lowerTags.includes('skin')) type = 'skin';
  else if (lowerTags.includes('map')) type = 'map';
  else if (lowerTags.includes('tool')) type = 'tool';

  return {
    id: api.id,
    title: api.title,
    description: api.description,
    downloads: api.downloads,
    rating,
    createdAt: new Date(api.created_at).getTime(),
    type,
    image: api.thumbnail_url || undefined,
    fileUrl: api.file_url || undefined,
    featured: (api.tags || []).includes('featured'),
    author: api.user_id ? `user-${api.user_id}` : 'Unknown Creator',
    author_username: api.author_username || null,
    author_avatar_url: api.author_avatar_url || null,
    authorAvatar: undefined,
    tags: api.tags || [],
    favoritesCount: api.votes_up,
    favorited: false,
    ratingCount: api.rating_count ?? totalVotes ?? 0,
  };
}

export function GameWorkshopPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating'>('popular');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadImage, setUploadImage] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileUrl, setUploadFileUrl] = useState('');
  const [uploadType, setUploadType] = useState<'mod' | 'skin' | 'map' | 'tool'>('mod');
  const [selectedItem, setSelectedItem] = useState<WorkshopItemView | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [ratingScore, setRatingScore] = useState<number>(0);
  const isAuthed = !!getAuthToken();
  const queryClient = useQueryClient();

  const { data: game, isLoading: isLoadingGame } = useQuery({
    queryKey: ['game', slug],
    queryFn: async () => {
      if (!slug) return null;
      const res = await gamesApi.search({ search: slug.replace(/-/g, ' ') }, 1, 1);
      return res.games[0] as GameResponse | undefined;
    },
    enabled: !!slug,
  });

  const { data: itemsResponse, isLoading: isLoadingItems } = useQuery({
    queryKey: ['workshop-items', slug],
    queryFn: () =>
      workshopApi.list(
        undefined, // search
        undefined, // status
        undefined, // visibility
        slug // game filter
      ),
    enabled: !!slug,
  });

  const ensureAuthenticated = () => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Please sign in to react or vote.');
      return false;
    }
    return true;
  };

  const updateCachedItems = (itemId: number, updater: (item: any) => any) => {
    queryClient.setQueryData(['workshop-items', slug], (data: any) => {
      if (!data?.items) return data;
      return {
        ...data,
        items: data.items.map((it: any) => (it.id === itemId ? updater(it) : it)),
      };
    });
  };

  const downloadMutation = useMutation({
    mutationFn: async (itemId: number) => workshopApi.download(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ['workshop-items', slug] });
      const prev = queryClient.getQueryData(['workshop-items', slug]);
      updateCachedItems(itemId, (it) => ({ ...it, downloads: (it.downloads || 0) + 1 }));
      return { prev };
    },
    onError: (error, _itemId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['workshop-items', slug], ctx.prev);
      toast.error(`Failed to download: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
    onSuccess: (data, itemId) => {
      const item = allItems.find((i) => i.id === itemId);
      const downloadUrl = data.download_url || item?.fileUrl;

      if (downloadUrl && (downloadUrl.startsWith('http') || downloadUrl.startsWith('data:'))) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = item?.title || 'download';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download started!');
      } else if (item?.fileUrl) {
        window.open(item.fileUrl, '_blank');
        toast.success('Opening file...');
      } else {
        toast.success('Download registered!');
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop-items', slug] });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: (itemId: number) => workshopApi.vote(itemId, true),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ['workshop-items', slug] });
      const prev = queryClient.getQueryData(['workshop-items', slug]);
      updateCachedItems(itemId, (it) => ({
        ...it,
        votes_up: (it.votes_up || 0) + 1,
      }));
      return { prev };
    },
    onError: (error, _itemId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['workshop-items', slug], ctx.prev);
      toast.error(`Failed to update vote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
    onSuccess: () => {
      toast.success('Thanks for the upvote!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop-items', slug] });
    },
  });

  const handleFileUpload = async (file: File): Promise<string> => {
    // Convert file to data URL for storage in database
    // In production, this would upload to S3 or similar storage
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Use data URL for images/files
        const dataUrl = reader.result as string;
        if (dataUrl) {
          resolve(dataUrl);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const allItems: WorkshopItemView[] = (itemsResponse?.items ?? []).map(mapWorkshopItem);
  const filteredItems = allItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || item.type === selectedType;
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    if (sortBy === 'popular') return b.downloads - a.downloads;
    if (sortBy === 'recent') return b.createdAt - a.createdAt;
    return b.rating - a.rating;
  });

  const featuredRanked = filteredItems
    .slice()
    .sort(
      (a, b) =>
        (b.downloads + (b.favoritesCount || 0) * 2 + b.rating * 10) -
        (a.downloads + (a.favoritesCount || 0) * 2 + a.rating * 10)
    )
    .slice(0, 3);
  const featuredIds = new Set(featuredRanked.map((i) => i.id));
  const regularItems = filteredItems.filter((item) => !featuredIds.has(item.id));

  const openDetail = (item: WorkshopItemView) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
    setRatingScore(0);
    setCommentText('');
  };

  const handleReaction = (label: string) => {
    if (!ensureAuthenticated()) return;
    toast.success(`${label} reaction recorded`);
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!slug) throw new Error('Game slug is required');
      if (!uploadTitle.trim() || !uploadDescription.trim()) {
        throw new Error('Title and description are required');
      }
      const tags = uploadTags
        .split(',')
        .map((tag: string) => tag.trim())
        .filter(Boolean);
      // include type as a tag for filtering
      if (uploadType) {
        tags.push(uploadType);
      }

      const payload: WorkshopItemCreate = {
        title: uploadTitle,
        description: uploadDescription,
        visibility: 'public',
        tags,
        game_id: slug,
        thumbnail_url: uploadImage || undefined,
      };

      if (uploadFile) {
        // Use upload endpoint to avoid base64 size limits
        return workshopApi.createWithUpload(payload, uploadFile);
      }

      // URL-only submission with length guard
      let fileUrl = uploadFileUrl;
      if (fileUrl && fileUrl.length > 480) {
        toast.error('File URL is too large. Please provide a smaller file or an external link.');
        fileUrl = '';
      }
      if (uploadImage && uploadImage.length > 480) {
        toast.error('Thumbnail URL is too large. Please use a shorter image URL.');
      }

      return workshopApi.create({
        ...payload,
        file_url: fileUrl || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Creation published to the workshop!');
      setUploadTitle('');
      setUploadDescription('');
      setUploadTags('');
      setUploadImage('');
      setUploadFile(null);
      setUploadFileUrl('');
      setUploadType('mod');
      queryClient.invalidateQueries({ queryKey: ['workshop-items', slug] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload item: ${error.message}`);
    },
  });

  const commentsQuery = useQuery({
    queryKey: ['workshop-comments', selectedItem?.id],
    enabled: !!selectedItem?.id,
    queryFn: () => workshopApi.listComments(selectedItem!.id, 100, 0),
  });

  const ratingQuery = useQuery<WorkshopRatingSummary>({
    queryKey: ['workshop-rating', selectedItem?.id],
    enabled: !!selectedItem?.id,
    queryFn: () => workshopApi.getRating(selectedItem!.id),
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => {
      if (!selectedItem) throw new Error('No item');
      return workshopApi.addComment(selectedItem.id, content);
    },
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['workshop-comments', selectedItem?.id] });
    },
    onError: (error: Error) => toast.error(`Failed to post comment: ${error.message}`),
  });

  const setRatingMutation = useMutation({
    mutationFn: (score: number) => {
      if (!selectedItem) throw new Error('No item');
      return workshopApi.setRating(selectedItem.id, score);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop-rating', selectedItem?.id] });
    },
    onError: (error: Error) => toast.error(`Failed to rate: ${error.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: number) => workshopApi.delete(itemId),
    onSuccess: () => {
      toast.success('Item deleted');
      setIsDetailOpen(false);
      queryClient.invalidateQueries({ queryKey: ['workshop-items', slug] });
    },
    onError: (error: Error) => toast.error(`Failed to delete: ${error.message}`),
  });

  if (isLoadingGame) {
    return <div className="space-y-4"><Skeleton className="h-32 w-full" /></div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-orbitron text-4xl font-black text-blood-500 mb-2">
            {game?.title} Workshop
          </h1>
          <p className="text-gray-400">Discover and share community creations</p>
        </div>
        <Button asChild variant="outline">
          <Link to={`/game/${slug}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Game
          </Link>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search workshop items..."
            className="pl-10 bg-void-800 border-void-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 bg-void-800 border border-void-700 rounded-md text-white focus:ring-blood-500 focus:border-blood-500"
          >
            <option value="all">All Types</option>
            <option value="mod">Mods</option>
            <option value="skin">Skins</option>
            <option value="map">Maps</option>
            <option value="tool">Tools</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'popular' | 'recent' | 'rating')}
            className="px-4 py-2 bg-void-800 border border-void-700 rounded-md text-white focus:ring-blood-500 focus:border-blood-500"
          >
            <option value="popular">Most Popular</option>
            <option value="recent">Most Recent</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="bg-void-800 border-void-700">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          {isLoadingItems ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <>
          {featuredRanked.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-yellow-500" />
                Featured Creations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredRanked.map((item) => (
                  <Card
                    key={item.id}
                    className="bg-void-800 border-void-700 hover:border-blood-500/50 transition-colors group cursor-pointer"
                    onClick={() => openDetail(item)}
                  >
                    <div className="relative h-48 overflow-hidden rounded-t-lg bg-void-700">
                      <WebGLImage
                        src={
                          isUserUploadedImage(item.image) && !isOrbUnsafe(item.image)
                            ? (item.image as string)
                            : defaultWorkshopFallback
                        }
                        alt={item.title}
                        className="w-full h-full object-cover"
                        fallback={defaultWorkshopFallback}
                      />
                      <Badge className="absolute top-2 right-2 bg-yellow-600">Featured</Badge>
                    </div>
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary">{item.type}</Badge>
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="text-sm font-bold">{item.rating}</span>
                        </div>
                      </div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{item.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={item.authorAvatar} />
                            <AvatarFallback>{(item.author || '??').substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <UserLink username={item.author || 'unknown'}>
                            {item.author || 'Unknown Creator'}
                          </UserLink>
                        </div>
                        <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, includeSeconds: true })}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Download className="h-4 w-4" />
                            <span>{item.downloads.toLocaleString()}</span>
                          </div>
                          {item.favoritesCount !== undefined && (
                            <div className="flex items-center gap-1">
                              <Heart className="h-4 w-4" />
                              <span>{item.favoritesCount}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 ${item.favorited ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!ensureAuthenticated()) return;
                              favoriteMutation.mutate(item.id);
                            }}
                            disabled={favoriteMutation.isPending}
                            title={item.favorited ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Heart className={`h-4 w-4 ${item.favorited ? 'fill-current' : ''}`} />
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-blood-500 hover:bg-blood-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadMutation.mutate(item.id);
                            }}
                            disabled={downloadMutation.isPending}
                          >
                            <Download className="mr-2 h-4 w-4" /> Download
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {item.tags.map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                      <CommentReactions compact />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold mb-4">All Creations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularItems.map(item => (
                <Card 
                  key={item.id} 
                  className="bg-void-800 border border-void-700/70 hover:border-blood-500/60 transition-all hover:-translate-y-1 shadow-lg shadow-black/30 cursor-pointer"
                  onClick={() => openDetail(item)}
                >
                    <div className="relative h-40 overflow-hidden rounded-t-lg bg-void-700">
                      <WebGLImage
                        src={
                          isUserUploadedImage(item.image) && !isOrbUnsafe(item.image)
                            ? (item.image as string)
                            : defaultWorkshopFallback
                        }
                        alt={item.title}
                        className="w-full h-full object-cover"
                        fallback={defaultWorkshopFallback}
                      />
                    </div>
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary">{item.type}</Badge>
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-sm font-bold">{item.rating}</span>
                      </div>
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={item.authorAvatar || item.author_avatar_url || undefined} />
                          <AvatarFallback>{(item.author || item.author_username || '??').substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <UserLink username={(item.author_username || item.author || 'unknown') || 'unknown'}>
                          {item.author_username || item.author || 'Unknown Creator'}
                        </UserLink>
                        <UserLink username={item.author_username || item.author || 'unknown'}>
                          {item.author_username || item.author || 'Unknown Creator'}
                        </UserLink>
                      </div>
                      <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Download className="h-4 w-4" />
                          <span>{item.downloads.toLocaleString()}</span>
                        </div>
                        {item.favoritesCount !== undefined && (
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            <span>{item.favoritesCount}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 ${item.favorited ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!ensureAuthenticated()) return;
                            favoriteMutation.mutate(item.id);
                          }}
                          disabled={favoriteMutation.isPending}
                          title={isAuthed ? (item.favorited ? 'Remove from favorites' : 'Add to favorites') : 'Sign in to vote'}
                        >
                          <Heart className={`h-4 w-4 ${item.favorited ? 'fill-current' : ''}`} />
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-blood-500 hover:bg-blood-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadMutation.mutate(item.id);
                          }}
                          disabled={downloadMutation.isPending}
                        >
                          <Download className="mr-2 h-4 w-4" /> Download
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {item.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                    <CommentReactions compact />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <p>No items found matching your criteria.</p>
            </div>
          )}
          </>
          )}
        </TabsContent>

        <TabsContent value="featured" className="space-y-6">
          {isLoadingItems ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-lg" />
              ))}
            </div>
          ) : featuredRanked.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredRanked.map((item) => (
              <Card key={item.id} className="bg-void-800 border-void-700 hover:border-blood-500/50 transition-colors">
                <div className="relative h-48 overflow-hidden rounded-t-lg bg-void-700">
                    {(() => {
                      const bannerUrl =
                        item.image &&
                        !item.image.includes('storage.example.com') &&
                        !isOrbUnsafe(item.image)
                          ? item.image
                          : defaultWorkshopFallback;
                    return (
                      <WebGLImage 
                        src={bannerUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover"
                        fallback={defaultWorkshopFallback}
                      />
                    );
                  })()}
                  <Badge className="absolute top-2 right-2 bg-yellow-600">Featured</Badge>
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary">{item.type}</Badge>
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-sm font-bold">{item.rating}</span>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{item.description}</p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        <span>{item.downloads.toLocaleString()}</span>
                      </div>
                      {item.favoritesCount !== undefined && (
                        <div className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          <span>{item.favoritesCount}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 w-8 p-0 ${item.favorited ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}`}
                        onClick={() => favoriteMutation.mutate(item.id)}
                        disabled={favoriteMutation.isPending}
                        title={item.favorited ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart className={`h-4 w-4 ${item.favorited ? 'fill-current' : ''}`} />
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-blood-500 hover:bg-blood-600"
                        onClick={() => downloadMutation.mutate(item.id)}
                        disabled={downloadMutation.isPending}
                      >
                        <Download className="mr-2 h-4 w-4" /> Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          ) : (
            <p className="text-center text-gray-400 py-10">No featured items yet.</p>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card className="bg-void-800 border-void-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Upload Your Creation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border-2 border-dashed border-void-700 p-6">
                <div className="text-center mb-8">
                  <Sparkles className="h-16 w-16 mx-auto mb-4 text-blood-500/50" />
                  <p className="text-lg font-semibold">Ready to share your creation?</p>
                  <p className="text-sm text-gray-400">Fill out the form below to publish it to the workshop.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-300">Title</p>
                    <Input
                      placeholder="Give your creation a standout name"
                      className="bg-void-700 border-void-600"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-300">Type</p>
                    <select
                      value={uploadType}
                      onChange={(e) => setUploadType(e.target.value as typeof uploadType)}
                      className="px-4 py-2 bg-void-700 border border-void-600 rounded-md text-white focus:ring-blood-500 focus:border-blood-500"
                    >
                      <option value="mod">Mod</option>
                      <option value="skin">Skin</option>
                      <option value="map">Map</option>
                      <option value="tool">Tool</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <p className="text-sm font-semibold text-gray-300">Short Description</p>
                    <Textarea
                      placeholder="Describe what makes this creation special..."
                      className="bg-void-700 border-void-600 min-h-[160px]"
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-300">Preview Image URL (optional)</p>
                    <Input
                      placeholder="https://example.com/preview.png"
                      className="bg-void-700 border-void-600"
                      value={uploadImage}
                      onChange={(e) => setUploadImage(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <p className="text-sm font-semibold text-gray-300">Upload File (3D Model, Asset, Image, etc.)</p>
                    <div className="flex items-center gap-4">
                      <label className="flex-1">
                        <input
                          type="file"
                          accept=".fbx,.obj,.glb,.gltf,.png,.jpg,.jpeg,.zip,.rar,.7z,.blend,.max,.ma,.mb"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setUploadFile(file);
                              // For demo, create a data URL
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setUploadFileUrl(URL.createObjectURL(file));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <div className="flex items-center gap-2 p-4 border-2 border-dashed border-void-600 rounded-lg hover:border-blood-500/50 transition-colors cursor-pointer bg-void-700/50">
                          <Upload className="h-5 w-5 text-gray-400" />
                          <div className="flex-1">
                            {uploadFile ? (
                              <div className="flex items-center gap-2">
                                <File className="h-4 w-4 text-blood-500" />
                                <span className="text-sm text-white">{uploadFile.name}</span>
                                <span className="text-xs text-gray-400">
                                  ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">Click to upload file (FBX, OBJ, PNG, JPG, ZIP, etc.)</span>
                            )}
                          </div>
                        </div>
                      </label>
                      {uploadFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUploadFile(null);
                            setUploadFileUrl('');
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Supported: 3D Models (.fbx, .obj, .glb, .gltf, .blend), Images (.png, .jpg), Archives (.zip, .rar)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-300">Tags (comma separated)</p>
                    <Input
                      placeholder="speedrun, co-op, sci-fi"
                      className="bg-void-700 border-void-600"
                      value={uploadTags}
                      onChange={(e) => setUploadTags(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
                  <p className="text-xs text-gray-500">
                    Submitting will publish this item to the {game?.title} workshop immediately.
                  </p>
                  <Button
                    className="bg-blood-500 hover:bg-blood-600"
                    onClick={() => uploadMutation.mutate()}
                    disabled={
                      !uploadTitle.trim() ||
                      !uploadDescription.trim() ||
                      !slug ||
                      uploadMutation.isPending
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {uploadMutation.isPending ? 'Uploading...' : 'Upload Item'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="bg-void-900 border-void-700 max-w-4xl">
          {selectedItem && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-4">
                  <span className="text-2xl">{selectedItem.title}</span>
                  <Badge variant="secondary">{selectedItem.type}</Badge>
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Discover the details, reactions, and downloads for this creation.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative rounded-xl overflow-hidden bg-void-800 border border-void-700">
                  <WebGLImage
                    src={
                      isUserUploadedImage(selectedItem.image) && !isOrbUnsafe(selectedItem.image)
                        ? (selectedItem.image as string)
                        : defaultWorkshopFallback
                    }
                    fallback={defaultWorkshopFallback}
                    alt={selectedItem.title}
                    className="w-full h-full object-cover min-h-[240px]"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <Avatar className="h-9 w-9">
                    <AvatarImage src={selectedItem.authorAvatar || selectedItem.author_avatar_url || undefined} />
                    <AvatarFallback>{(selectedItem.author_username || selectedItem.author || '??').substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                    <UserLink username={(selectedItem.author_username || selectedItem.author || 'unknown') || 'unknown'}>
                      {selectedItem.author_username || selectedItem.author || 'Unknown Creator'}
                      </UserLink>
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(selectedItem.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{selectedItem.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.tags.length ? selectedItem.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    )) : <span className="text-xs text-gray-500">No tags added</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Download className="h-4 w-4" />
                      <span>{selectedItem.downloads.toLocaleString()} downloads</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-current text-yellow-500" />
                      <span>{selectedItem.rating.toFixed(1)} rating</span>
                    </div>
                    {selectedItem.favoritesCount !== undefined && (
                      <div className="flex items-center gap-1">
                        <Heart className="h-4 w-4 text-red-400" />
                        <span>{selectedItem.favoritesCount} likes</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => downloadMutation.mutate(selectedItem.id)}
                      disabled={downloadMutation.isPending}
                    >
                      <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!ensureAuthenticated()) return;
                        favoriteMutation.mutate(selectedItem.id);
                      }}
                      disabled={favoriteMutation.isPending}
                    >
                      <Heart className="mr-2 h-4 w-4" />
                      Like
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (!ensureAuthenticated()) return;
                        deleteMutation.mutate(selectedItem.id);
                      }}
                      disabled={deleteMutation.isPending}
                      className="ml-auto"
                    >
                      Delete (admin)
                    </Button>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      <CommentReactions compact />
                      <button
                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-void-800 border border-void-700 hover:border-blood-500/60 transition-colors"
                        onClick={() => handleReaction('Yes')}
                      >
                        <span className="font-semibold text-white">Yes</span>
                      </button>
                      <button
                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-void-800 border border-void-700 hover:border-blood-500/60 transition-colors"
                        onClick={() => handleReaction('No')}
                      >
                        <span className="font-semibold text-white">No</span>
                      </button>
                      <button
                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-void-800 border border-void-700 hover:border-blood-500/60 transition-colors"
                        onClick={() => handleReaction('Funny')}
                      >
                        <span className="font-semibold text-white">Funny</span>
                      </button>
                      <button
                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-void-800 border border-void-700 hover:border-blood-500/60 transition-colors"
                        onClick={() => handleReaction('Award')}
                      >
                        <span className="font-semibold text-white">Award</span>
                      </button>
                    </div>
                    <div className="rounded-lg border border-void-700 bg-void-800/80 p-3 w-full space-y-2">
                      <h4 className="text-sm font-semibold">Ratings</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Star className="h-4 w-4 fill-current text-yellow-500" />
                        <span>
                          {ratingQuery.data?.rating_avg
                            ? `${ratingQuery.data.rating_avg.toFixed(1)} (${ratingQuery.data.rating_count})`
                            : 'No ratings yet'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-500">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <button
                            key={i}
                            disabled={setRatingMutation.isPending}
                            onClick={() => {
                              if (!ensureAuthenticated()) return;
                              setRatingScore(i);
                              setRatingMutation.mutate(i);
                            }}
                            className="p-1"
                            title={`Rate ${i}`}
                          >
                            <Star
                              className={`h-5 w-5 ${
                                (ratingScore || ratingQuery.data?.rating_avg || 0) >= i ? 'opacity-100' : 'opacity-50'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg border border-void-700 bg-void-800/80 p-3 w-full space-y-3">
                      <h4 className="text-sm font-semibold">Comments</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {commentsQuery.isLoading ? (
                          <p className="text-xs text-gray-500">Loading comments...</p>
                        ) : commentsQuery.data && commentsQuery.data.length > 0 ? (
                          commentsQuery.data.map((c: WorkshopComment) => (
                            <div key={c.id} className="rounded-md border border-void-700 bg-void-900/70 p-2">
                              <div className="text-xs text-gray-500 flex justify-between">
                                <span>User {c.user_id}</span>
                                <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                              </div>
                              <p className="text-sm text-gray-200 mt-1 whitespace-pre-wrap">{c.content}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-gray-500">No comments yet.</p>
                        )}
                      </div>
                      <Textarea
                        placeholder="Add a comment"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="bg-void-900 border-void-700 text-sm"
                        disabled={addCommentMutation.isPending}
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!ensureAuthenticated()) return;
                            if (!commentText.trim()) {
                              toast.error('Comment cannot be empty');
                              return;
                            }
                            addCommentMutation.mutate(commentText.trim());
                          }}
                          disabled={addCommentMutation.isPending}
                        >
                          Post Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
