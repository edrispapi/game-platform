'use client';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Star, Calendar, User, ArrowLeft, Plus, Filter, Search, TrendingUp, Sparkles } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Game } from "@shared/types";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface WorkshopItem {
  id: string;
  title: string;
  description: string;
  author: string;
  authorAvatar: string;
  createdAt: number;
  downloads: number;
  rating: number;
  tags: string[];
  type: 'mod' | 'skin' | 'map' | 'tool';
  image: string;
  featured?: boolean;
}

const MOCK_WORKSHOP_ITEMS: WorkshopItem[] = [
  {
    id: 'item-1',
    title: 'Enhanced Graphics Mod',
    description: 'Improves textures, lighting, and overall visual quality. Compatible with all DLCs.',
    author: 'ModMaster',
    authorAvatar: 'https://i.pravatar.cc/150?u=modmaster',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    downloads: 15420,
    rating: 4.8,
    tags: ['Graphics', 'Visual'],
    type: 'mod',
    image: '/images/cyberpunk-banner.svg',
    featured: true,
  },
  {
    id: 'item-2',
    title: 'Neon City Skin Pack',
    description: 'A collection of vibrant neon-themed skins for weapons and vehicles.',
    author: 'SkinCreator',
    authorAvatar: 'https://i.pravatar.cc/150?u=skincreator',
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    downloads: 8920,
    rating: 4.6,
    tags: ['Skins', 'Cosmetic'],
    type: 'skin',
    image: '/images/cyberpunk-shot1.svg',
  },
  {
    id: 'item-3',
    title: 'Custom Night City Map',
    description: 'Explore a completely redesigned Night City with new districts and hidden areas.',
    author: 'MapBuilder',
    authorAvatar: 'https://i.pravatar.cc/150?u=mapbuilder',
    createdAt: Date.now() - 1000 * 60 * 60 * 72,
    downloads: 12340,
    rating: 4.9,
    tags: ['Map', 'Exploration'],
    type: 'map',
    image: '/images/cyberpunk-shot2.svg',
    featured: true,
  },
  {
    id: 'item-4',
    title: 'Performance Optimizer Tool',
    description: 'Automatically adjusts settings for optimal performance on your hardware.',
    author: 'TechWizard',
    authorAvatar: 'https://i.pravatar.cc/150?u=techwizard',
    createdAt: Date.now() - 1000 * 60 * 60 * 96,
    downloads: 21560,
    rating: 4.7,
    tags: ['Tool', 'Performance'],
    type: 'tool',
    image: '/images/cyberpunk-shot3.svg',
  },
];

export function GameWorkshopPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating'>('popular');

  const { data: game, isLoading: isLoadingGame } = useQuery({
    queryKey: ['game', slug],
    queryFn: () => api<Game>(`/api/games/${slug}`),
    enabled: !!slug,
  });

  const filteredItems = MOCK_WORKSHOP_ITEMS.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || item.type === selectedType;
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    if (sortBy === 'popular') return b.downloads - a.downloads;
    if (sortBy === 'recent') return b.createdAt - a.createdAt;
    return b.rating - a.rating;
  });

  const featuredItems = filteredItems.filter(item => item.featured);
  const regularItems = filteredItems.filter(item => !item.featured);

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
          {featuredItems.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-yellow-500" />
                Featured Creations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredItems.map(item => (
                  <Card key={item.id} className="bg-void-800 border-void-700 hover:border-blood-500/50 transition-colors">
                    <div className="relative h-48 overflow-hidden rounded-t-lg">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
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
                            <AvatarFallback>{item.author.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <span>{item.author}</span>
                        </div>
                        <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Download className="h-4 w-4" />
                            <span>{item.downloads.toLocaleString()}</span>
                          </div>
                        </div>
                        <Button size="sm" className="bg-blood-500 hover:bg-blood-600">
                          <Download className="mr-2 h-4 w-4" /> Download
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {item.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
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
                <Card key={item.id} className="bg-void-800 border-void-700 hover:border-blood-500/50 transition-colors">
                  <div className="relative h-40 overflow-hidden rounded-t-lg">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
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
                          <AvatarFallback>{item.author.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span>{item.author}</span>
                      </div>
                      <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Download className="h-4 w-4" />
                        <span>{item.downloads.toLocaleString()}</span>
                      </div>
                      <Button size="sm" className="bg-blood-500 hover:bg-blood-600">
                        <Download className="mr-2 h-4 w-4" /> Download
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {item.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
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
        </TabsContent>

        <TabsContent value="featured" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredItems.map(item => (
              <Card key={item.id} className="bg-void-800 border-void-700 hover:border-blood-500/50 transition-colors">
                <div className="relative h-48 overflow-hidden rounded-t-lg">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Download className="h-4 w-4" />
                      <span>{item.downloads.toLocaleString()}</span>
                    </div>
                    <Button size="sm" className="bg-blood-500 hover:bg-blood-600">
                      <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card className="bg-void-800 border-void-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Upload Your Creation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-20 text-gray-400 border-2 border-dashed border-void-700 rounded-lg">
                <Sparkles className="h-16 w-16 mx-auto mb-4 text-blood-500/50" />
                <p className="text-lg mb-2">Ready to share your creation?</p>
                <p className="text-sm">Upload functionality coming soon!</p>
                <Button className="mt-4 bg-blood-500 hover:bg-blood-600" disabled>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Item
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
